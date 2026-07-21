export type ImageLoadingMode = {
  loading: "lazy" | "eager";
  fetchPriority: "high" | "low" | "auto";
};

const WSRV_ENDPOINT = "https://wsrv.nl/";

export const buildOptimizedImageUrl = (url: string, width: number, quality = 75) => {
  if (!url || !/^https?:\/\//.test(url)) return url;

  const requestUrl = new URL(url);
  requestUrl.searchParams.set("_", String(Date.now()));

  const params = new URLSearchParams({
    url: requestUrl.toString(),
    w: String(width),
    q: String(quality),
    output: "webp",
    fit: "cover",
  });

  return `${WSRV_ENDPOINT}?${params.toString()}`;
};

export const getImageLoadingMode = ({ priority = false }: { priority?: boolean }): ImageLoadingMode => ({
  loading: priority ? "eager" : "lazy",
  fetchPriority: priority ? "high" : "auto",
});

export const isHeroImageContext = (priority?: boolean) => !!priority;
