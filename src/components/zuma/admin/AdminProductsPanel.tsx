import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type DbProduct, resolveImage } from "@/hooks/useProducts";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Plus } from "lucide-react";

const empty = {
  slug: "", name: "", description: "", price: 0, category: "T-Shirts",
  image_url: "", stock: 0, is_visible: true, sort_order: 0,
};

export const AdminProductsPanel = () => {
  const { products } = useProducts({ adminMode: true });
  const [editing, setEditing] = useState<Partial<DbProduct> | null>(null);

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing, price: Number(editing.price), stock: Number(editing.stock), sort_order: Number(editing.sort_order ?? 0) };
    if (!payload.slug || !payload.name) { toast.error("Slug and name required"); return; }
    const { error } = editing.id
      ? await supabase.from("products").update(payload as Partial<DbProduct>).eq("id", editing.id)
      : await supabase.from("products").insert(payload as DbProduct);
    if (error) { console.error(error); toast.error("Could not save product"); } else { toast.success("Saved"); setEditing(null); }
  };
  const toggleVisible = async (p: DbProduct) => {
    await supabase.from("products").update({ is_visible: !p.is_visible }).eq("id", p.id);
  };
  const remove = async (p: DbProduct) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
  };

  return (
    <>
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-lg tracking-[0.25em]">PRODUCTS ({products.length})</h2>
          <button onClick={() => setEditing({ ...empty })} className="px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.22em] uppercase flex items-center gap-2 hover:bg-primary-hi">
            <Plus className="w-3 h-3" /> New Product
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className={`border border-border p-4 flex gap-4 ${!p.is_visible ? "opacity-50" : ""}`}>
              <img src={resolveImage(p)} alt={p.name} className="w-16 h-20 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-display tracking-[0.15em] truncate">
                  <span className="text-primary-hi mr-2">#{p.display_id ?? "—"}</span>{p.name}
                </div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">
                  {p.category} · {p.price} MAD · stock {p.stock}
                </div>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setEditing(p)} className="text-[10px] tracking-[0.2em] uppercase text-primary-hi hover:underline">Edit</button>
                  <button onClick={() => toggleVisible(p)} className="text-muted-foreground hover:text-primary-hi" title={p.is_visible ? "Hide" : "Show"}>
                    {p.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => remove(p)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/90 grid place-items-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-card border border-border p-6 my-10">
            <h3 className="font-display text-xl tracking-[0.25em] mb-5">{editing.id ? "EDIT" : "NEW"} PRODUCT</h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["slug", "Slug"], ["name", "Name"], ["category", "Category"], ["price", "Price (MAD)"],
                ["stock", "Stock"], ["sort_order", "Sort Order"], ["image_url", "Image URL (https://...)"],
              ] as const).map(([k, l]) => (
                <label key={k} className={`flex flex-col gap-1 ${k === "image_url" ? "col-span-2" : ""}`}>
                  <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{l}</span>
                  <input
                    type={["price","stock","sort_order"].includes(k) ? "number" : "text"}
                    value={editing[k as keyof DbProduct] ?? ""}
                    onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                    className="bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
                  />
                </label>
              ))}
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Description</span>
                <textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-background border border-border px-3 py-2 text-sm h-20 focus:border-primary outline-none" />
              </label>
              <label className="col-span-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editing.is_visible ?? true} onChange={e => setEditing({ ...editing, is_visible: e.target.checked })} />
                <span className="tracking-[0.18em] uppercase text-muted-foreground">Visible on shop</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} className="flex-1 py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
