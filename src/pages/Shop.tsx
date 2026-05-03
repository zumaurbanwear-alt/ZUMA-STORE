import { useEffect } from "react";
import { TextureBand } from "@/components/zuma/TextureBand";
import { ProductGrid } from "@/components/zuma/ProductGrid";
import { SiteLayout } from "@/components/zuma/SiteLayout";
import { useProducts } from "@/hooks/useProducts";

const Shop = () => {
  const { products, loading } = useProducts();

  useEffect(() => {
    document.title = "ZÜMA — SHOP | All Products";
  }, []);

  const count = products.length;

  return (
    <SiteLayout>
      <div className="pt-32 pb-20 px-20 md:px-40">
        <div className="max-w-[1200px] mx-auto mb-12">
          <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">
            INVENTORY VAULT // {count} ITEMS
          </div>
          <h1 className="font-display text-foreground" style={{ fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "0.12em" }}>
            ALL PRODUCTS
          </h1>
        </div>
        <ProductGrid products={products} loading={loading} />
      </div>

      <TextureBand label="DROP 000 — Archive" right="↓ Archive" ghost="ARCHIVE" />
    </SiteLayout>
  );
};

export default Shop;
