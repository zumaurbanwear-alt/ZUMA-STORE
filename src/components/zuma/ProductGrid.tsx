import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { resolveImage, type DbProduct } from "@/hooks/useProducts";

const NEW_THRESHOLD_DAYS = 14;

const badgeFor = (p: DbProduct) => {
  if (p.stock === 0) return { label: "SOLD OUT", className: "bg-black text-white" };
  if (p.stock <= 3) return { label: "FEW LEFT", className: "bg-primary text-primary-foreground" };
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
  if (ageDays <= NEW_THRESHOLD_DAYS) return { label: "NEW", className: "bg-primary text-primary-foreground" };
  return null;
};

export const ProductCard = ({ p }: { p: DbProduct }) => {
  const badge = badgeFor(p);
  const soldOut = p.stock === 0;
  return (
    <Link to={`/product/${p.slug}`} className="group block bg-card hover:bg-secondary transition-colors">
      <div className="relative aspect-[3/4] overflow-hidden bg-background">
        <img
          src={resolveImage(p)}
          alt={p.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${soldOut ? "opacity-40 grayscale" : ""}`}
        />
        {badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[9px] tracking-[0.22em] uppercase ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex justify-between items-start gap-3 border-t border-border">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3 className="font-display text-base md:text-lg tracking-[0.18em] text-foreground" style={{ minHeight: "2.8em" }}>
            {p.name}
          </h3>
          <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{p.category}</span>
        </div>
        <span className="text-[9px] tracking-[0.18em] text-primary-hi whitespace-nowrap mt-1">{p.price} MAD</span>
      </div>
    </Link>
  );
};

export const ProductGrid = ({
  products,
  loading,
  showFilters = true,
  limit,
}: {
  products: DbProduct[];
  loading?: boolean;
  showFilters?: boolean;
  limit?: number;
}) => {
  const [cat, setCat] = useState("All");
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ["All", ...Array.from(set)];
  }, [products]);
  const filtered = useMemo(() => {
    const list = cat === "All" ? products : products.filter(p => p.category === cat);
    const sorted = [...list].sort((a, b) => {
      if ((a.stock === 0) !== (b.stock === 0)) return a.stock === 0 ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [products, cat, limit]);

  return (
    <div>
      {showFilters && categories.length > 2 && (
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map(c => (
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
      )}
      {loading && <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading inventory...</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">No products in this category yet.</p>
      )}
      <div className="grid grid-cols-2 gap-4 max-w-[600px]">
        {filtered.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
};
