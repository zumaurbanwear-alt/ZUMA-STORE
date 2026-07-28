import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DistrictSelect } from "@/components/zuma/checkout/DistrictSelect";
import type { AdminOrder } from "../orders/types";

type SenditDistrict = {
  district_id: number;
  name: string;
  ville: string;
  price?: number;
};

type Props = {
  order: AdminOrder;
  onClose: () => void;
  onSaved: (updated: Partial<AdminOrder>) => void;
};

// Formulaire pour corriger/compléter les infos client d'une commande —
// utile en particulier pour une commande manuelle à qui on veut
// finalement créer un colis Sendit : il faut alors un district Sendit
// valide, que le formulaire de création manuelle ne demande pas.
export const AdminEditOrderModal = ({ order, onClose, onSaved }: Props) => {
  const [name, setName] = useState(order.customer_name ?? "");
  const [phone, setPhone] = useState(order.customer_phone ?? "");
  const [email, setEmail] = useState(order.customer_email ?? "");
  const [city, setCity] = useState(order.customer_city ?? "");
  const [address, setAddress] = useState(order.customer_address ?? "");
  const [districtId, setDistrictId] = useState<number | null>(order.sendit_district_id ?? null);
  const [districtName, setDistrictName] = useState(order.customer_district ?? "");
  const [districts, setDistricts] = useState<SenditDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prix promo : normalement réservé aux commandes créées via la modale
  // "commande manuelle" (order_source "admin_manual"), mais assoupli
  // temporairement pour couvrir aussi les commandes manuelles créées
  // avant l'ajout de ce marqueur (shipping_provider "manual"). À resserrer
  // sur order_source seul quand demandé.
  const canEditPricing =
    (order.order_source === "admin_manual" || order.shipping_provider === "manual") &&
    !order.tracking_number;
  const [itemPrices, setItemPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries((order.order_items ?? []).map((it) => [it.id ?? "", it.unit_price ?? 0]))
  );

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

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    city.trim().length >= 2 &&
    address.trim().length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expirée");
        return;
      }

      const fields = {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || null,
        customer_city: city.trim(),
        customer_address: address.trim(),
        customer_district: districtName || null,
        sendit_district_id: districtId,
      };

      const res = await fetch("/api/order-admin-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "update-fields", orderId: order.id, fields }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erreur mise à jour");
        return;
      }

      if (canEditPricing) {
        const overrides = (order.order_items ?? [])
          .filter((it) => it.id)
          .map((it) => ({ id: it.id as string, unit_price: itemPrices[it.id as string] ?? it.unit_price ?? 0 }));

        if (overrides.length > 0) {
          const priceRes = await fetch("/api/order-admin-actions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: "override-item-pricing", orderId: order.id, items: overrides }),
          });

          if (!priceRes.ok) {
            const priceJson = await priceRes.json();
            toast.error(`Infos mises à jour, mais prix non appliqués : ${priceJson.error ?? "erreur"}`);
            onSaved(fields);
            onClose();
            return;
          }
        }
      }

      toast.success("Informations mises à jour");
      onSaved(fields);
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
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[60]" />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-[70] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-display tracking-[0.15em] text-primary-hi">
            MODIFIER LES INFOS — #{order.display_id}
          </div>
          <button
            onClick={onClose}
            className="border border-border px-2 py-1 text-[9px] uppercase tracking-[0.1em]"
          >
            Fermer
          </button>
        </div>

        <div className="text-[9px] text-muted-foreground mb-4 leading-relaxed">
          Corrige les infos client avant de créer le colis — utile si le client a donné une
          mauvaise adresse, ou si la commande a été créée manuellement sans district Sendit.
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
        </div>

        <div className="border border-border p-3 mb-3 space-y-2">
          <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-1">LIVRAISON</div>

          <input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              // Changer de ville invalide le district déjà choisi.
              setDistrictId(null);
              setDistrictName("");
            }}
            placeholder="Ville"
            className="w-full border border-border p-2 text-xs bg-transparent"
          />

          <DistrictSelect
            label="District Sendit"
            v={districtId}
            set={(id, name) => {
              setDistrictId(id);
              setDistrictName(name);
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
            placeholder="Adresse complète"
            rows={3}
            className="w-full border border-border p-2 text-xs bg-transparent resize-none"
          />
        </div>

        {canEditPricing && (order.order_items?.length ?? 0) > 0 && (
          <div className="border border-border p-3 mb-3 space-y-2">
            <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-1">
              PRIX DES ARTICLES (PROMOTION)
            </div>
            <div className="text-[9px] text-muted-foreground mb-1 leading-relaxed">
              Commande créée manuellement, colis pas encore créé — les prix restent modifiables.
            </div>

            {(order.order_items ?? []).map((it) => (
              <div key={it.id} className="flex items-center gap-1.5">
                <span className="flex-1 text-xs">
                  {it.product_name} {it.size ? `(${it.size}${it.color ? `, ${it.color}` : ""})` : ""} ×{it.quantity}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemPrices[it.id ?? ""] ?? it.unit_price ?? 0}
                  onChange={(e) =>
                    setItemPrices((prev) => ({ ...prev, [it.id ?? ""]: Number(e.target.value) || 0 }))
                  }
                  className="w-20 border border-primary p-1.5 text-xs bg-transparent text-right"
                />
                <span className="text-[9px] text-muted-foreground">MAD</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full border border-primary py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {saving ? "ENREGISTREMENT..." : "ENREGISTRER"}
        </button>
      </div>
    </>
  );
};
