import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useProducts = (opts: { adminMode?: boolean } = {}) => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      let q = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (!opts.adminMode) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (!active) return;
      if (!error && data) setProducts(data as DbProduct[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("products-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [opts.adminMode]);
  return { products, loading };
};

export const useProductImages = (productId: string | undefined) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!productId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("position", { ascending: true });
      if (!error && data) setImages(data as ProductImage[]);
      setLoading(false);
    };
    load();
  }, [productId]);
  return { images, loading };
};
