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

  return (
    <SiteLayout>
      <div className="pt-44 md:pt-40 pb-20 px-6 md:px-10">
        <ProductGrid products={products} loading={loading} showUndocumented />
      </div>

      <TextureBand label="DROP 000 — Archive" right="↓ Archive" ghost="ARCHIVE" />
    </SiteLayout>
  );
};

export default Shop;
