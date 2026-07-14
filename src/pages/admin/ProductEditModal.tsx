import type { DbProduct } from "@/hooks/useProducts";

export const ProductEditModal = ({
  editing, setEditing, onSave,
}: {
  editing: Partial<DbProduct>;
  setEditing: (p: Partial<DbProduct> | null) => void;
  onSave: () => void;
}) => (
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
        <button onClick={onSave} className="flex-1 py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi">Save</button>
        <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi">Cancel</button>
      </div>
    </div>
  </div>
);
