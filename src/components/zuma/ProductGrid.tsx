import { useMemo, useState } from "react";
import { resolveImage, type DbProduct } from "@/hooks/useProducts";

const CATEGORIES = ["All", "T-Shirts"];
const NEW_THRESHOLD_DAYS = 14;

const badgeFor = (p: DbProduct) => {
  if (p.stock === 0) return { label: "SOLD OUT", className: "bg-black text-white" };
  if (p.stock <= 3) return { label: "FEW LEFT", className: "bg-primary text-primary-foreground" };
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
  if (ageDays <= NEW_THRESHOLD_DAYS) return { label: "NEW", className: "bg-black text-white" };
  return null;
};

export const ProductGrid = ({
  products, onAdd, loading,
}: { products: DbProduct[]; onAdd: (p: DbProduct) => void; loading?: boolean }) => {
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => {
    const list = cat === "All" ? products : products.filter(p => p.category === cat);
    return [...list].sort((a, b) => {
      if ((a.stock === 0) !== (b.stock === 0)) return a.stock === 0 ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, cat]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-5 py-2.5 text-[10px] tracking-[0.22em] uppercase border transition-colors ${
              cat === c ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading inventory...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">No products in this category yet.</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filtered.map(p => {
          const badge = badgeFor(p);
          const soldOut = p.stock === 0;
          return (
            <article key={p.id} className="group border border-border bg-card hover:border-primary-hi transition-colors flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-background">
                <img
                  src={resolveImage(p)}
                  alt={p.name}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${soldOut ? "opacity-40 grayscale" : ""}`}
                />
                {badge && (
                  <span className={`absolute top-3 left-3 px-2.5 py-1 text-[9px] tracking-[0.2em] uppercase ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="p-4 md:p-5 flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-display text-lg md:text-2xl tracking-[0.18em] text-foreground">{p.name}</h3>
                  <span className="text-xs md:text-sm text-primary-hi whitespace-nowrap">{p.price} MAD</span>
                </div>
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">{p.category}</div>
                {p.description && <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 hidden md:block">{p.description}</p>}
                <button
                  disabled={soldOut}
                  onClick={() => onAdd(p)}
                  className="mt-2 self-start px-3 py-2 md:px-4 md:py-2.5 border border-primary text-primary text-[9px] md:text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {soldOut ? "Sold Out" : "Add to Cart"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

