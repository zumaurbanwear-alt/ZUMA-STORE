import { useState } from "react";
import { buildOptimizedImageUrl, getImageLoadingMode, type ImageLoadingMode } from "./imageUtils";

type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  quality?: number;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  priority?: boolean;
  style?: React.CSSProperties;
  sizes?: string;
  srcSet?: string;
  decoding?: "async" | "auto" | "sync";
  fallbackSrc?: string;
};

export const OptimizedImage = ({
  src,
  alt,
  width = 1200,
  quality = 75,
  className,
  loading,
  fetchPriority,
  priority = false,
  style,
  sizes,
  srcSet,
  decoding = "async",
  fallbackSrc,
}: OptimizedImageProps) => {
  const [failed, setFailed] = useState(false);
  const mode: ImageLoadingMode = getImageLoadingMode({ priority });
  const effectiveLoading = loading ?? mode.loading;
  const effectivePriority = fetchPriority ?? mode.fetchPriority;
  const resolvedSrc = !src || failed ? (fallbackSrc ?? src) : buildOptimizedImageUrl(src, width, quality);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={effectiveLoading}
      fetchPriority={effectivePriority}
      decoding={decoding}
      sizes={sizes}
      srcSet={srcSet}
      style={style}
      onError={() => { if (!failed) setFailed(true); }}
    />
  );
};
