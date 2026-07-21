import { Eye, EyeOff, Trash2, Plus } from "lucide-react";
import type { DbProduct } from "@/hooks/useProducts";
import { resolveImage } from "@/hooks/useProducts";
import { OptimizedImage } from "@/components/zuma/common/OptimizedImage";

type ProductsListProps = {
  products: DbProduct[];
  onEdit: (product: DbProduct) => void;
  onToggleVisible: (product: DbProduct) => void;
  onRemove: (product: DbProduct) => void;
  onCreate: () => void;
};

export const ProductsList = ({ products, onEdit, onToggleVisible, onRemove, onCreate }: ProductsListProps) => (
  <>
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-display text-lg tracking-[0.25em]">PRODUCTS ({products.length})</h2>
      <button onClick={onCreate} className="px-4 py-2 bg-primary text-primary-foreground text-[10px] tracking-[0.22em] uppercase flex items-center gap-2 hover:bg-primary-hi">
        <Plus className="w-3 h-3" /> New Product
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => (
        <div key={p.id} className={`border border-border p-4 flex gap-4 ${!p.is_visible ? "opacity-50" : ""}`}>
          <OptimizedImage src={resolveImage(p)} alt={p.name} width={160} className="w-16 h-20 object-cover" loading="lazy" fetchPriority="auto" />
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-[0.15em] truncate">
              <span className="text-primary-hi mr-2">#{p.display_id ?? "—"}</span>{p.name}
            </div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">
              {p.category} · {p.price} MAD · stock {p.stock}
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => onEdit(p)} className="text-[10px] tracking-[0.2em] uppercase text-primary-hi hover:underline">Edit</button>
              <button onClick={() => onToggleVisible(p)} className="text-muted-foreground hover:text-primary-hi" title={p.is_visible ? "Hide" : "Show"}>
                {p.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => onRemove(p)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
