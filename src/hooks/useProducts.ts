import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildOptimizedImageUrl } from "@/components/zuma/common/imageUtils";

export type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  collection: string | null;
  image_url: string;
  stock: number;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  material: string | null;
  origin: string | null;
  archive_ref: string | null;
  archive_url: string | null;
  badge: string | null;
  display_id: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  color: string | null;
  side: string | null;
  position: number;
};

export const resolveImage = (p: Pick<DbProduct, "slug" | "image_url">) => {
  if (p.image_url && /^https?:\/\//.test(p.image_url)) return p.image_url;
  return "";
};

// A cart thumbnail displayed at 64px has no business downloading the same
// file as the full-bleed product photo. Supabase's own image transforms
// require a Pro plan, so this routes through wsrv.nl instead — a free,
// no-signup image proxy/CDN that can resize and re-encode any publicly
// reachable image URL (our Supabase bucket is already public). If it's
// ever unreachable, the <ProductImg> component (see
// components/zuma/ProductImg.tsx) falls back to the original URL
// automatically, so images never break — they just aren't right-sized
// until the proxy responds.
export const transformImage = (url: string, width: number, quality = 75): string =>
  buildOptimizedImageUrl(url, width, quality);

const productsQueryKey = (adminMode: boolean) => ["products", { adminMode }] as const;

const fetchProducts = async (adminMode: boolean): Promise<DbProduct[]> => {
  let q = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (!adminMode) q = q.eq("is_visible", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbProduct[];
};

// Products are cached by react-query and shared across every page that calls
// useProducts(), so navigating Index -> Shop -> Product no longer re-fetches
// the whole catalog each time. A single realtime channel per mode keeps the
// cache fresh in the background instead of every mounted page opening its
// own websocket subscription.
export const useProducts = (opts: { adminMode?: boolean } = {}) => {
  const adminMode = !!opts.adminMode;
  const queryClient = useQueryClient();
  const queryKey = productsQueryKey(adminMode);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchProducts(adminMode),
    staleTime: 60_000, // reuse cached data for 60s before refetching in the background
  });

  useEffect(() => {
    const channel = supabase
      .channel(`products-live-${adminMode ? "admin" : "public"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ["product-images"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, () => {
        queryClient.invalidateQueries({ queryKey: ["product-images"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMode]);

  return { products: data ?? [], loading: isLoading };
};

const fetchProductImages = async (productId: string): Promise<ProductImage[]> => {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductImage[];
};

// Exposed so links can warm the cache on hover (see ProductGrid) — by the
// time the user actually clicks, the images are often already loaded.
export const prefetchProductImages = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string
) =>
  queryClient.prefetchQuery({
    queryKey: ["product-images", productId],
    queryFn: () => fetchProductImages(productId),
    staleTime: 60_000,
  });

export const useProductImages = (productId: string | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: () => fetchProductImages(productId as string),
    enabled: !!productId,
    staleTime: 60_000,
  });

  return { images: data ?? [], loading: isLoading };
};
