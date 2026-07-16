import { useMemo, useState } from "react";
import { type DbProduct } from "@/hooks/useProducts";
import { ProductCard, ProductCardSkeleton } from "@/components/zuma/product/ProductCard";
import { useLang } from "@/context/LanguageContext";

// Cards within this index don't need to scroll into view — they're on
// screen the moment the page loads, so they should never be held back by
// loading="lazy" (which delays the fetch behind a viewport-proximity
// check the browser has to compute first).
const EAGER_LOAD_COUNT = 4;

const ProductGridSkeleton = ({ count }: { count: number }) => (
  <div className="grid grid-cols-2 gap-4 max-w-[600px]">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);

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

  const { t } = useLang();
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
      {loading && <ProductGridSkeleton count={limit ?? 8} />}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">{t("noProducts")}</p>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-w-[600px]">
          {filtered.map((p, i) => <ProductCard key={p.id} p={p} priority={i < EAGER_LOAD_COUNT} />)}
        </div>
      )}
    </div>
  );
};
