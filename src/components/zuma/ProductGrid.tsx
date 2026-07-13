import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { resolveImage, prefetchProductImages, type DbProduct } from "@/hooks/useProducts";
import { ProductImg } from "@/components/zuma/ProductImg";
import { preloadProductPage } from "@/pages/Product.preload";
import { useLang } from "@/context/LanguageContext";

// Cards within this index don't need to scroll into view — they're on
// screen the moment the page loads, so they should never be held back by
// loading="lazy" (which delays the fetch behind a viewport-proximity
// check the browser has to compute first).
const EAGER_LOAD_COUNT = 4;

const NEW_THRESHOLD_DAYS = 14;

const useBadgeFor = () => {
  const { t } = useLang();
  return (p: DbProduct) => {
    if (p.stock === 0) return { label: t("soldOut").toUpperCase(), className: "bg-black text-white" };

    // Manual override from the database
    if (p.badge === "new") return { label: t("new").toUpperCase(), className: "bg-primary text-primary-foreground" };
    if (p.badge === "few_left") return { label: t("fewLeft").toUpperCase(), className: "bg-primary text-primary-foreground" };
    if (p.badge === "sold_out") return { label: t("soldOut").toUpperCase(), className: "bg-black text-white" };
    if (p.badge === "none") return null;

    // Automatic fallback if no manual badge is set
    if (p.stock <= 3) return { label: t("fewLeft").toUpperCase(), className: "bg-primary text-primary-foreground" };
    const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
    if (ageDays <= NEW_THRESHOLD_DAYS) return { label: t("new").toUpperCase(), className: "bg-primary text-primary-foreground" };
    return null;
  };
};

export const ProductCard = ({ p, priority = false }: { p: DbProduct; priority?: boolean }) => {
  const badgeFor = useBadgeFor();
  const badge = badgeFor(p);
  const soldOut = p.stock === 0;
  const queryClient = useQueryClient();
  const warm = () => {
    preloadProductPage();
    prefetchProductImages(queryClient, p.id);
  };
  return (
    <Link
      to={`/product/${p.slug}`}
      onMouseEnter={warm}
      onTouchStart={warm}
      className="group block hover:bg-secondary transition-colors"
      style={{ background: "hsl(var(--card))" }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-background">
        <ProductImg
          src={resolveImage(p)}
          width={600}
          alt={p.name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${soldOut ? "opacity-40 grayscale" : ""}`}
        />
        {badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[9px] tracking-[0.22em] uppercase ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
<div className="px-4 py-3 flex flex-col gap-1 border-t border-border">
  <h3 className="font-display text-base md:text-lg tracking-[0.18em] text-foreground">
    {p.name}
  </h3>
  <span className="text-[9px] tracking-[0.18em] text-primary-hi">{p.price} MAD</span>
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
      {loading && <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">{t("loading")}</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">{t("noProducts")}</p>
      )}
      <div className="grid grid-cols-2 gap-4 max-w-[600px]">
        {filtered.map((p, i) => <ProductCard key={p.id} p={p} priority={i < EAGER_LOAD_COUNT} />)}
      </div>
    </div>
  );
};
