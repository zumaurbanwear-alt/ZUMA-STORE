import { ChevronDown } from "lucide-react";
import type { DbProduct } from "@/hooks/useProducts";
import { AdminProductVariants } from "./components/AdminProductVariants";
import { AdminProductImages } from "./components/AdminProductImages";

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
          ["sort_order", "Sort Order"], ["collection", "Collection"],
          ["material", "Material"], ["origin", "Origin"],
          ["archive_ref", "Archive Ref"], ["archive_url", "Archive URL (https://...)"],
          ["image_url", "Image URL (https://...)"],
        ] as const).map(([k, l]) => (
          <label key={k} className={`flex flex-col gap-1 ${["archive_url","image_url"].includes(k) ? "col-span-2" : ""}`}>
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{l}</span>
            <input
              type={["price","sort_order"].includes(k) ? "number" : "text"}
              value={editing[k as keyof DbProduct] ?? ""}
              onChange={e => setEditing({ ...editing, [k]: e.target.value })}
              className="bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Badge</span>
          <div className="relative">
            <select
              value={editing.badge ?? "none"}
              onChange={e => setEditing({ ...editing, badge: e.target.value })}
              className="w-full appearance-none bg-background border border-border pl-3 pr-8 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="none">None (auto)</option>
              <option value="new">New</option>
              <option value="few_left">Few Left</option>
              <option value="sold_out">Sold Out</option>
            </select>
            <ChevronDown className="w-3 h-3 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Produced (date)</span>
          <input
            type="date"
            value={editing.created_at ? editing.created_at.slice(0, 10) : ""}
            onChange={e => setEditing({ ...editing, created_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="bg-background border border-border px-3 py-2 text-sm focus:border-primary outline-none"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Description</span>
          <textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-background border border-border px-3 py-2 text-sm h-20 focus:border-primary outline-none" />
        </label>
        <label className="col-span-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={editing.is_visible ?? true} onChange={e => setEditing({ ...editing, is_visible: e.target.checked })} />
          <span className="tracking-[0.18em] uppercase text-muted-foreground">Visible on shop</span>
        </label>

        {editing.id && <AdminProductVariants productId={editing.id} />}
        {editing.id && (
          <AdminProductImages
            productId={editing.id}
            productSlug={editing.slug ?? ""}
          />
        )}
        {!editing.id && (
          <div className="col-span-2 text-[10px] text-muted-foreground border border-border p-3">
            Enregistre d'abord le produit pour pouvoir gérer son stock par couleur/taille et ses photos.
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onSave} className="flex-1 py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi">Save</button>
        <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi">Cancel</button>
      </div>
    </div>
  </div>
);
