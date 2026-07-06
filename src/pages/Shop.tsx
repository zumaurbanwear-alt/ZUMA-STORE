import { useEffect } from "react";
import { TextureBand } from "@/components/zuma/TextureBand";
import { ProductGrid } from "@/components/zuma/ProductGrid";
import { SiteLayout } from "@/components/zuma/SiteLayout";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";

const Shop = () => {
  const { products, loading } = useProducts();
  const { t } = useLang();

  useEffect(() => {
    document.title = "ZÜMA — SHOP | All Products";
  }, []);

  const count = products.length;

  return (
    <SiteLayout>
      <div className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto mb-12 border-b border-border pb-4">
  <div className="text-[12px] tracking-[0.25em] uppercase text-foreground">
    {t("inventoryVault")} // {count} {t("items")}
  </div>
</div>
        <ProductGrid products={products} loading={loading} />
      </div>

      <TextureBand label="DROP 000 — Archive" right="↓ Archive" ghost="ARCHIVE" />
    </SiteLayout>
  );
};

export default Shop;
