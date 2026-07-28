import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrderDisplayId } from "@/lib/supabaseAdmin";
import { DistrictSelect } from "@/components/zuma/checkout/DistrictSelect";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
};

type ManualItem = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  quantity: number;
  customPrice: number | null;
};

type SenditDistrict = {
  district_id: number;
  name: string;
  ville: string;
  price?: number;
};

const emptyItem = (): ManualItem => ({
  id: crypto.randomUUID(),
  product_id: "",
  size: "",
  color: "",
  quantity: 1,
  customPrice: null,
});

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

// Crée une commande admin en dehors du checkout public — soit une
// "livraison manuelle" (amis/famille, remise en main propre, pas de
// colis Sendit), soit une commande normale à qui on crée directement le
// colis Sendit (ex: commande prise par téléphone). Elle rejoint la même
// table `orders` que les commandes du checkout, donc elle prend un
// display_id (#0000N) dans la même séquence — rien à faire de spécial
// pour ça, c'est juste la table qui s'en charge.
//
// Écriture en 2 temps pour rester dans les clous des policies RLS
// existantes (qui n'ont jamais été pensées pour une insertion admin
// directe) :
//  1) INSERT avec status "pending" / cash_on_delivery — satisfait la
//     policy "Visitors create valid orders" (ouverte à tous, mêmes
//     règles que le checkout public).
//  2) UPDATE juste après vers status "confirmed" (+ shipping_provider
//     "manual" pour le colis manuel) — satisfait "admin_update_orders"
//     (réservée aux admins).
//
// Les articles doivent référencer un vrai produit du catalogue : un
// trigger anti-fraude côté DB (mis en place pour le checkout) rejette
// tout order_item dont le product_id ou le prix ne correspond pas
// exactement à la table `products`. D'où le select ci-dessous plutôt
// qu'un champ texte libre — le prix est verrouillé sur celui du produit.
export const AdminManualOrderModal = ({ onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("Remis en main propre");
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [districtName, setDistrictName] = useState("");
  const [districts, setDistricts] = useState<SenditDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ManualItem[]>([emptyItem()]);
  const [saving, setSaving] = useState<"manual" | "sendit" | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [promotion, setPromotion] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error("Erreur chargement produits");
        }
        setProducts(data ?? []);
        setLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    const cleanCity = city.trim();
    if (cleanCity.length < 2) {
      setDistricts([]);
      return;
    }

    setLoadingDistricts(true);
    supabase
      .from("sendit_districts")
      .select("district_id, name, ville, price")
      .ilike("ville", cleanCity)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setDistricts([]);
        } else {
          setDistricts(data ?? []);
        }
        setLoadingDistricts(false);
      });
  }, [city]);

  const priceOf = (productId: string) => products.find((p) => p.id === productId)?.price ?? 0;

  // Prix réellement facturé pour la ligne : le prix catalogue normalement,
  // ou le prix promo saisi à la main si la coche PROMOTION est active et
  // qu'un prix a été renseigné pour cette ligne.
  const effectivePriceOf = (it: ManualItem) =>
    promotion && it.customPrice !== null ? it.customPrice : priceOf(it.product_id);

  const subtotal = items.reduce((s, it) => s + it.quantity * effectivePriceOf(it), 0);
  const total = subtotal + shippingFee;

  const updateItem = (i: number, patch: Partial<ManualItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    city.trim().length >= 2 &&
    address.trim().length >= 5 &&
    items.length > 0 &&
    items.every((it) => it.product_id && it.size.trim() && it.color.trim() && it.quantity > 0);

  const canSubmitSendit = canSubmit && districtId !== null;

  const handleSubmit = async (mode: "manual" | "sendit") => {
    if (saving) return;
    if (mode === "manual" && !canSubmit) return;
    if (mode === "sendit" && !canSubmitSendit) return;

    setSaving(mode);

    try {
      const trimmedEmail = email.trim();
      const emailValue = trimmedEmail.length >= 5 ? trimmedEmail : "livraison-manuelle@zuma.local";
      const orderId = crypto.randomUUID();

      // 1) Insert respectant la policy publique (mêmes contraintes que le checkout).
      //    Pas de .select() ici — id généré côté client (comme dans le checkout),
      //    ce qui évite la relecture immédiate de la ligne (soumise à une policy
      //    différente) et les faux-positifs RLS qui en découlaient.
      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        customer_name: name.trim(),
        customer_email: emailValue,
        customer_phone: phone.trim(),
        customer_city: city.trim(),
        customer_address: address.trim(),
        customer_district: districtName || null,
        sendit_district_id: districtId,
        payment_method: "cash_on_delivery",
        status: "pending",
        subtotal,
        shipping_fee: shippingFee,
      });

      if (orderError) {
        toast.error(orderError.message);
        return;
      }

      // unit_price est fourni pour respecter la contrainte NOT NULL, mais le
      // trigger set_order_item_unit_price() l'écrase de toute façon avec le
      // prix réel du produit — donc toujours cohérent, jamais falsifiable.
      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((it) => ({
          id: it.id,
          order_id: orderId,
          product_id: it.product_id,
          product_name: products.find((p) => p.id === it.product_id)?.name ?? "",
          size: it.size.trim(),
          color: it.color.trim(),
          quantity: it.quantity,
          unit_price: priceOf(it.product_id),
        }))
      );

      if (itemsError) {
        toast.error(itemsError.message);
        return;
      }

      // Prix promo : le trigger anti-fraude vient de forcer unit_price au
      // prix catalogue à l'insertion — on corrige juste après via l'action
      // admin dédiée (RLS + endpoint réservés aux admins).
      if (promotion) {
        const overrides = items
          .filter((it) => it.customPrice !== null)
          .map((it) => ({ id: it.id, unit_price: it.customPrice as number }));

        if (overrides.length > 0) {
          const {
            data: { session: promoSession },
          } = await supabase.auth.getSession();

          if (promoSession) {
            const promoRes = await fetch("/api/order-admin-actions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${promoSession.access_token}`,
              },
              body: JSON.stringify({
                action: "override-item-pricing",
                orderId,
                items: overrides,
              }),
            });

            if (!promoRes.ok) {
              const promoResult = await promoRes.json();
              toast.error(`Commande créée, mais prix promo non appliqués : ${promoResult.error ?? "erreur"}`);
            }
          }
        }
      }

      // 2) Bascule immédiate en "confirmed" — réservé aux admins.
      //    "manual" pose le provider "manual" (pas de colis Sendit).
      //    "sendit" laisse shipping_provider vide, comme une commande
      //    normale du checkout, avant de déclencher la création du colis.
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          shipping_provider: mode === "manual" ? "manual" : null,
          admin_notes: notes.trim() || null,
        })
        .eq("id", orderId);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      await supabase.from("order_events").insert({
        order_id: orderId,
        event: "confirmed",
        message:
          mode === "manual"
            ? "Commande créée manuellement (livraison hors Sendit)"
            : "Commande créée manuellement (colis Sendit)",
      });

      const { data: displayIdData } = await getOrderDisplayId(orderId);

      if (mode === "sendit") {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error("Session expirée — commande créée, mais colis non créé. Ouvre la commande pour réessayer.");
          onCreated();
          onClose();
          return;
        }

        const res = await fetch("/api/create-sendit-shipment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        });

        const result = await res.json();

        if (!res.ok) {
          toast.error(
            `Commande #${displayIdData ?? ""} créée, mais colis Sendit refusé : ${result.error ?? "erreur"}`
          );
          onCreated();
          onClose();
          return;
        }

        toast.success(`Commande #${displayIdData ?? ""} créée — colis Sendit ${result.tracking_number ?? ""}`);
        onCreated();
        onClose();
        return;
      }

      toast.success(`Commande #${displayIdData ?? ""} créée`);
      onCreated();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erreur serveur");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-display tracking-[0.15em] text-primary-hi">
            NOUVELLE COMMANDE MANUELLE
          </div>
          <button
            onClick={onClose}
            className="border border-border px-2 py-1 text-[9px] uppercase tracking-[0.1em]"
          >
            Fermer
          </button>
        </div>

        <div className="text-[9px] text-muted-foreground mb-4 leading-relaxed">
          Pour une commande prise en dehors du checkout (téléphone, en personne...). Elle
          apparaîtra dans la même liste, avec un numéro de commande à la suite des autres. Choisis
          en bas si c'est toi qui livres ("colis manuel") ou si Sendit doit livrer ("colis Sendit").
        </div>

        <div className="border border-border p-3 mb-3 space-y-2">
          <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-1">CLIENT</div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="w-full border border-border p-2 text-xs bg-transparent"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="w-full border border-border p-2 text-xs bg-transparent"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optionnel)"
            className="w-full border border-border p-2 text-xs bg-transparent"
          />
          <input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrictId(null);
              setDistrictName("");
            }}
            placeholder="Ville"
            className="w-full border border-border p-2 text-xs bg-transparent"
          />

          <DistrictSelect
            label="District Sendit (requis pour colis Sendit)"
            v={districtId}
            set={(id, dName) => {
              setDistrictId(id);
              setDistrictName(dName);
            }}
            districts={districts}
            placeholder={
              loadingDistricts
                ? "Chargement..."
                : districts.length === 0
                ? "Aucun district pour cette ville"
                : "Choisir un district"
            }
          />

          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="Adresse / précisions de remise"
            className="w-full border border-border p-2 text-xs bg-transparent resize-none"
          />
        </div>

        <div className="border border-border p-3 mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi">ARTICLES</div>
            <button
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="text-[9px] uppercase tracking-[0.1em] underline"
            >
              + Ajouter
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] cursor-pointer">
            <input
              type="checkbox"
              checked={promotion}
              onChange={(e) => setPromotion(e.target.checked)}
              className="accent-primary"
            />
            Promotion (prix modifiable par article)
          </label>

          {loadingProducts && (
            <div className="text-[9px] text-muted-foreground">Chargement des produits...</div>
          )}

          {items.map((it, i) => (
            <div key={it.id} className="space-y-1.5 pb-2 border-b border-border last:border-0 last:pb-0">
              <div className="flex gap-1.5">
                <select
                  value={it.product_id}
                  onChange={(e) => updateItem(i, { product_id: e.target.value })}
                  className="flex-1 border border-border p-1.5 text-xs bg-transparent"
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price} MAD
                    </option>
                  ))}
                </select>
                {items.length > 1 && (
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[9px] px-2 border border-border"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={it.size}
                  onChange={(e) => updateItem(i, { size: e.target.value })}
                  placeholder="Taille"
                  className="w-1/3 border border-border p-1.5 text-xs bg-transparent"
                />
                <input
                  value={it.color}
                  onChange={(e) => updateItem(i, { color: e.target.value })}
                  placeholder="Couleur"
                  className="w-1/3 border border-border p-1.5 text-xs bg-transparent"
                />
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 1 })}
                  placeholder="Qté"
                  className="w-1/3 border border-border p-1.5 text-xs bg-transparent"
                />
              </div>

              {promotion && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] uppercase text-muted-foreground whitespace-nowrap">
                    Prix promo
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.customPrice ?? priceOf(it.product_id)}
                    onChange={(e) =>
                      updateItem(i, { customPrice: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    placeholder={`${priceOf(it.product_id)} MAD (catalogue)`}
                    className="flex-1 border border-primary p-1.5 text-xs bg-transparent"
                  />
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">MAD</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border border-border p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{subtotal} MAD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Frais de livraison</span>
            <input
              type="number"
              min={0}
              value={shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
              className="w-20 border border-border p-1 text-xs bg-transparent text-right"
            />
          </div>
          <div className="flex items-center justify-between text-sm font-display pt-1 border-t border-border">
            <span>Total</span>
            <span className="text-primary-hi">{total} MAD</span>
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Note interne (optionnel)"
          className="w-full border border-border p-2 text-xs bg-transparent resize-none mb-2"
        />

        <div className="flex gap-2 mb-1.5">
          <button
            onClick={() => handleSubmit("manual")}
            disabled={!canSubmit || saving !== null}
            className="flex-1 border border-primary py-2 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            {saving === "manual" ? "CRÉATION..." : "CRÉER COLIS MANUEL"}
          </button>

          <button
            onClick={() => handleSubmit("sendit")}
            disabled={!canSubmitSendit || saving !== null}
            className="flex-1 border border-primary py-2 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            {saving === "sendit" ? "CRÉATION..." : "CRÉER COLIS SENDIT"}
          </button>
        </div>

        {!canSubmitSendit && canSubmit && (
          <div className="text-[9px] text-red-600 leading-relaxed">
            Choisis un district Sendit ci-dessus pour pouvoir créer un colis Sendit.
          </div>
        )}
      </div>
    </>
  );
};
