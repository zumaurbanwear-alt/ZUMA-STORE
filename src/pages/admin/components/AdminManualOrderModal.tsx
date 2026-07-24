import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ManualItem = {
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
};

const emptyItem = (): ManualItem => ({
  product_name: "",
  size: "",
  color: "",
  quantity: 1,
  unit_price: 0,
});

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

// Crée une commande "livraison manuelle" (amis/famille, remise en main
// propre — pas de colis Sendit). Elle rejoint la même table `orders` que
// les commandes du checkout, donc elle prend un display_id (#0000N) dans
// la même séquence — rien à faire de spécial pour ça, c'est juste la
// table qui s'en charge.
//
// Écriture en 2 temps pour rester dans les clous des policies RLS
// existantes (qui n'ont jamais été pensées pour une insertion admin
// directe) :
//  1) INSERT avec status "pending" / cash_on_delivery — satisfait la
//     policy "Visitors create valid orders" (ouverte à tous, mêmes
//     règles que le checkout public).
//  2) UPDATE juste après vers status "confirmed" + shipping_provider
//     "manual" — satisfait "admin_update_orders" (réservée aux admins).
export const AdminManualOrderModal = ({ onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("Remis en main propre");
  const [shippingFee, setShippingFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ManualItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const total = subtotal + shippingFee;

  const updateItem = (i: number, patch: Partial<ManualItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    city.trim().length >= 2 &&
    address.trim().length >= 5 &&
    items.length > 0 &&
    items.every(
      (it) => it.product_name.trim() && it.size.trim() && it.color.trim() && it.quantity > 0 && it.unit_price >= 0
    );

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    try {
      const trimmedEmail = email.trim();
      const emailValue = trimmedEmail.length >= 5 ? trimmedEmail : "livraison-manuelle@zuma.local";

      // 1) Insert respectant la policy publique (mêmes contraintes que le checkout).
      const { data: inserted, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: name.trim(),
          customer_email: emailValue,
          customer_phone: phone.trim(),
          customer_city: city.trim(),
          customer_address: address.trim(),
          payment_method: "cash_on_delivery",
          status: "pending",
          subtotal,
          shipping_fee: shippingFee,
        })
        .select("id, display_id")
        .single();

      if (orderError || !inserted) {
        toast.error(orderError?.message ?? "Erreur création commande");
        return;
      }

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((it) => ({
          order_id: inserted.id,
          product_name: it.product_name.trim(),
          size: it.size.trim(),
          color: it.color.trim(),
          quantity: it.quantity,
          unit_price: it.unit_price,
        }))
      );

      if (itemsError) {
        toast.error(itemsError.message);
        return;
      }

      // 2) Bascule immédiate en "confirmed" + provider "manual" — réservé aux admins.
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          shipping_provider: "manual",
          admin_notes: notes.trim() || null,
        })
        .eq("id", inserted.id);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      await supabase.from("order_events").insert({
        order_id: inserted.id,
        event: "confirmed",
        message: "Commande créée manuellement (livraison hors Sendit)",
      });

      toast.success(`Commande #${inserted.display_id} créée`);
      onCreated();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erreur serveur");
    } finally {
      setSaving(false);
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
          Pour une livraison que tu fais toi-même (amis, famille...), sans passer par Sendit.
          Elle apparaîtra dans la même liste, avec un numéro de commande à la suite des autres.
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
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className="w-full border border-border p-2 text-xs bg-transparent"
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

          {items.map((it, i) => (
            <div key={i} className="space-y-1.5 pb-2 border-b border-border last:border-0 last:pb-0">
              <div className="flex gap-1.5">
                <input
                  value={it.product_name}
                  onChange={(e) => updateItem(i, { product_name: e.target.value })}
                  placeholder="Produit"
                  className="flex-1 border border-border p-1.5 text-xs bg-transparent"
                />
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
                  className="w-1/4 border border-border p-1.5 text-xs bg-transparent"
                />
                <input
                  value={it.color}
                  onChange={(e) => updateItem(i, { color: e.target.value })}
                  placeholder="Couleur"
                  className="w-1/4 border border-border p-1.5 text-xs bg-transparent"
                />
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 1 })}
                  placeholder="Qté"
                  className="w-1/4 border border-border p-1.5 text-xs bg-transparent"
                />
                <input
                  type="number"
                  min={0}
                  value={it.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) || 0 })}
                  placeholder="Prix"
                  className="w-1/4 border border-border p-1.5 text-xs bg-transparent"
                />
              </div>
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
          className="w-full border border-border p-2 text-xs bg-transparent resize-none mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full border border-primary py-2 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
        >
          {saving ? "CRÉATION..." : "CRÉER LA COMMANDE"}
        </button>
      </div>
    </>
  );
};
