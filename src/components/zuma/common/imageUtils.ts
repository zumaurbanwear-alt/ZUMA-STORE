export type ImageLoadingMode = {
  loading: "lazy" | "eager";
  fetchPriority: "high" | "low" | "auto";
};

// Product images are already served pre-optimized (webp, correctly sized)
// straight from Supabase Storage. We used to route them through the wsrv.nl
// proxy to resize/re-encode on the fly, but its re-compression (q=75 by
// default) was visibly degrading images — most noticeably banding/pixelation
// on solid dark colors like black t-shirts. So this is now a passthrough:
// the original Supabase URL is returned untouched, at full source quality.
export const buildOptimizedImageUrl = (url: string, _width: number, _quality = 75) => url;

export const getImageLoadingMode = ({ priority = false }: { priority?: boolean }): ImageLoadingMode => ({
  loading: priority ? "eager" : "lazy",
  fetchPriority: priority ? "high" : "auto",
});

export const isHeroImageContext = (priority?: boolean) => !!priority;
