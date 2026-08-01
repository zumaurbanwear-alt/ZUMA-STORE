import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Variant = {
  id: string;
  color: string;
  size: string;
  stock: number;
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

const sortSizes = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
};

export const AdminProductVariants = ({ productId }: { productId: string }) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");

  const load = () => {
    setLoading(true);
    supabase
      .from("product_variants")
      .select("id, color, size, stock")
      .eq("product_id", productId)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error("Erreur chargement variantes");
        }
        setVariants(data ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const colors = Array.from(new Set(variants.map((v) => v.color))).sort();
  const sizes = Array.from(new Set(variants.map((v) => v.size))).sort(sortSizes);
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  const updateStock = async (variant: Variant, stock: number) => {
    if (stock < 0 || Number.isNaN(stock)) return;
    setSavingId(variant.id);
    setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, stock } : v)));

    const { error } = await supabase.from("product_variants").update({ stock }).eq("id", variant.id);

    if (error) {
      console.error(error);
      toast.error("Erreur sauvegarde stock");
      load();
    }
    setSavingId(null);
  };

  const addVariant = async () => {
    const color = newColor.trim().toUpperCase();
    const size = newSize.trim().toUpperCase();
    if (!color || !size) return;

    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      color,
      size,
      stock: 0,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewColor("");
    setNewSize("");
    load();
  };

  const removeVariant = async (variant: Variant) => {
    const { error } = await supabase.from("product_variants").delete().eq("id", variant.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  if (loading) {
    return <div className="text-[10px] text-muted-foreground py-3">Chargement des variantes...</div>;
  }

  return (
    <div className="col-span-2 border border-border p-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
          Stock par couleur / taille
        </span>
        <span className="text-[10px] font-display text-primary-hi">TOTAL : {totalStock}</span>
      </div>

      {variants.length === 0 ? (
        <div className="text-[10px] text-muted-foreground mb-3">Aucune variante — ajoutes-en une ci-dessous.</div>
      ) : (
        <table className="w-full text-xs mb-3 border-collapse">
          <thead>
            <tr>
              <td className="text-[8px] uppercase text-muted-foreground pb-1">Couleur \ Taille</td>
              {sizes.map((s) => (
                <td key={s} className="text-[8px] uppercase text-muted-foreground pb-1 text-center">{s}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => (
              <tr key={color} className="border-t border-border">
                <td className="py-1.5 text-[10px] uppercase font-medium">{color}</td>
                {sizes.map((size) => {
                  const v = variants.find((x) => x.color === color && x.size === size);
                  if (!v) return <td key={size} className="text-center text-muted-foreground">—</td>;
                  return (
                    <td key={size} className="text-center py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={v.stock}
                          disabled={savingId === v.id}
                          onChange={(e) => updateStock(v, Number(e.target.value))}
                          className="w-12 border border-border bg-transparent text-center py-0.5 text-xs disabled:opacity-50"
                        />
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer le variant ${color} / ${size} ?`)) removeVariant(v);
                          }}
                          className="text-[9px] text-muted-foreground hover:text-destructive"
                          title="Supprimer ce variant"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex gap-1.5 items-center pt-2 border-t border-border">
        <input
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          placeholder="Couleur (ex: BLACK)"
          className="flex-1 border border-border bg-transparent px-2 py-1 text-[10px]"
        />
        <input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          placeholder="Taille (ex: M)"
          className="w-24 border border-border bg-transparent px-2 py-1 text-[10px]"
        />
        <button
          onClick={addVariant}
          className="border border-primary px-3 py-1 text-[9px] uppercase tracking-[0.1em] hover:bg-primary hover:text-primary-foreground"
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
};
