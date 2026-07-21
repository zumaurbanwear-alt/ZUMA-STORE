import { OptimizedImage } from "@/components/zuma/common/OptimizedImage";

// Renders a Supabase-hosted product image at its original, full-quality
// URL (no resizing/re-compression proxy in front of it).
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
