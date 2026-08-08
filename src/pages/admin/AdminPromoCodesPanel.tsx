import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PromoCode = {
  id: string;
  code: string;
  percent_off: number;
  is_active: boolean;
  created_at: string;
};

export const AdminPromoCodesPanel = () => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, code, percent_off, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setCodes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addCode = async () => {
    const code = newCode.trim().toUpperCase();
    const percent = parseFloat(newPercent.replace(",", "."));

    if (!code) {
      toast.error("Code manquant");
      return;
    }
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      toast.error("Pourcentage invalide (entre 1 et 100)");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      code,
      percent_off: percent,
    });
    setSaving(false);

    if (error) {
      toast.error(
        error.message.includes("duplicate") ? "Ce code existe déjà" : error.message
      );
      return;
    }

    toast.success(`Code ${code} créé`);
    setNewCode("");
    setNewPercent("");
    load();
  };

  const toggleActive = async (promo: PromoCode) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  const removeCode = async (promo: PromoCode) => {
    if (!confirm(`Supprimer le code ${promo.code} ?`)) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", promo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <section className="mb-12">
      <h2 className="font-display text-lg tracking-[0.25em] mb-4">CODES PROMO</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="CODE (ex: ZUMA10)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="border border-border bg-transparent px-3 py-2 text-xs uppercase flex-1"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="% de réduction"
          value={newPercent}
          onChange={(e) => setNewPercent(e.target.value)}
          className="border border-border bg-transparent px-3 py-2 text-xs w-40"
        />
        <button
          onClick={addCode}
          disabled={saving}
          className="border border-primary text-primary px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {saving ? "..." : "Ajouter"}
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-[9px] uppercase tracking-[0.1em]">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Réduction</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  Chargement...
                </td>
              </tr>
            )}
            {!loading && codes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  Aucun code promo pour l'instant.
                </td>
              </tr>
            )}
            {!loading &&
              codes.map((promo) => (
                <tr key={promo.id}>
                  <td className="px-3 py-2 font-display tracking-[0.1em]">{promo.code}</td>
                  <td className="px-3 py-2">-{promo.percent_off}%</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleActive(promo)}
                      className={`text-[9px] uppercase tracking-[0.1em] px-2 py-1 border ${
                        promo.is_active
                          ? "border-emerald-500 text-emerald-500"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {promo.is_active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeCode(promo)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
