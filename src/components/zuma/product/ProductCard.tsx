import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { resolveImage, prefetchProductImages, type DbProduct } from "@/hooks/useProducts";
import { ProductImg } from "@/components/zuma/product/ProductImg";
import { Skeleton } from "@/components/zuma/common/Skeleton";
import { preloadProductPage } from "@/pages/Product.preload";
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

// Mirrors ProductCard's exact structure — same aspect-[3/4] image area,
// same two-line text block below — so the grid never jumps or reflows
// once real products replace these placeholders.
export const ProductCardSkeleton = () => (
  <div style={{ background: "hsl(var(--card))" }}>
    <Skeleton className="aspect-[3/4] w-full" />
    <div className="px-4 py-3 flex flex-col gap-2 border-t border-border">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-2.5 w-1/3" />
    </div>
  </div>
);
