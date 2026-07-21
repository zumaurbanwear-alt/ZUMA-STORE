import { OptimizedImage } from "@/components/zuma/common/OptimizedImage";

// Requests a size-appropriate version of a Supabase-hosted product image
// instead of always downloading the full original. If image transforms
// aren't enabled on the Supabase project, the transformed URL 404s and
// this silently falls back to the original file — images never break,
// they just aren't right-sized until transforms are turned on.
export const ProductImg = ({
  src,
  width,
  quality,
  alt,
  className,
  loading = "lazy",
  fetchPriority,
  style,
}: {
  src: string;
  width: number;
  quality?: number;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  style?: React.CSSProperties;
}) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={width}
    quality={quality}
    className={className}
    loading={loading}
    fetchPriority={fetchPriority}
    style={style}
  />
);
