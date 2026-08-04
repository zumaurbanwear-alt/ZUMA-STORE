import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CONTENT_KEYS: { key: string; label: string }[] = [
  { key: "homepage_hero", label: "Accueil (hero)" },
  { key: "faq", label: "FAQ" },
  { key: "contact", label: "Contact" },
  { key: "privacy", label: "Confidentialité" },
  { key: "terms", label: "CGV" },
  { key: "shipping_policy", label: "Livraison" },
  { key: "return_policy", label: "Retours" },
];

export const AdminContentPanel = () => {
  const [rows, setRows] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(CONTENT_KEYS[0].key);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_content").select("key, data");
    if (error) {
      toast.error(error.message);
    } else {
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => {
        map[r.key] = JSON.stringify(r.data, null, 2);
      });
      setRows(map);
      setDraft(map[selected] ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraft(rows[selected] ?? "");
    setJsonError(null);
  }, [selected, rows]);

  const save = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setJsonError("JSON invalide — vérifie les virgules/guillemets.");
      return;
    }
    setJsonError(null);
    setSaving(true);

    const { error } = await supabase
      .from("site_content")
      .upsert({ key: selected, data: parsed as never }, { onConflict: "key" });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contenu enregistré — visible immédiatement sur le site.");
    load();
  };

  const resetToDefault = async () => {
    if (!confirm("Revenir au contenu par défaut (celui codé en dur) pour ce bloc ?")) return;
    const { error } = await supabase.from("site_content").delete().eq("key", selected);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Revenu au contenu par défaut.");
    load();
  };

  return (
    <section className="mb-12">
      <h2 className="font-display text-lg tracking-[0.25em] mb-4">CONTENU DU SITE</h2>

      <div className="flex gap-4">
        <div className="w-48 shrink-0 border border-border">
          {CONTENT_KEYS.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              className={`w-full text-left px-3 py-2 text-[10px] uppercase tracking-[0.1em] border-b border-border last:border-b-0 ${
                selected === c.key ? "bg-primary text-primary-foreground" : "hover:bg-muted/30"
              }`}
            >
              {c.label}
              {rows[c.key] === undefined && (
                <span className="block text-[8px] opacity-60 normal-case">(défaut)</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="text-[10px] text-muted-foreground">Chargement...</div>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="w-full h-96 border border-border bg-background p-3 text-[11px] font-mono leading-relaxed focus:border-primary outline-none"
              />
              {jsonError && (
                <div className="text-[10px] text-red-600 mt-1">{jsonError}</div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="border border-primary text-primary px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "..." : "Enregistrer"}
                </button>
                <button
                  onClick={resetToDefault}
                  className="border border-border text-muted-foreground px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:text-destructive"
                >
                  Revenir au défaut
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
