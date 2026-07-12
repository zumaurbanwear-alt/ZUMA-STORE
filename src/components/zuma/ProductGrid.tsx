import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { resolveImage, type DbProduct } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";

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

const ProductCardSkeleton = () => (
  <div className="block animate-pulse" aria-hidden>
    <div className="relative aspect-[3/4] overflow-hidden bg-muted" />
    <div className="px-4 py-3 flex flex-col gap-2 border-t border-border">
      <div className="h-3.5 w-3/4 bg-muted" />
      <div className="h-2.5 w-1/3 bg-muted" />
    </div>
  </div>
);

export const ProductCard = memo(({ p, priority = false }: { p: DbProduct; priority?: boolean }) => {
  const badgeFor = useBadgeFor();
  const badge = badgeFor(p);
  const soldOut = p.stock === 0;
  return (
    <Link to={`/product/${p.slug}`} className="group block hover:bg-secondary transition-colors" style={{ background: "hsl(var(--card))" }}>
      <div className="relative aspect-[3/4] overflow-hidden bg-background">
        <img
          src={resolveImage(p)}
          alt={p.name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-40 grayscale" : ""}`}
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
});
ProductCard.displayName = "ProductCard";

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
      {!loading && filtered.length === 0 && (
        <p className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">{t("noProducts")}</p>
      )}
      <div className="grid grid-cols-2 gap-4 max-w-[600px]">
        {loading
          ? Array.from({ length: limit ?? 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : filtered.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 2} />)}
      </div>
    </div>
  );
};
