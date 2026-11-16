import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { SiteLayout } from "@/components/zuma/layout/SiteLayout";
import { TextureBand } from "@/components/zuma/layout/TextureBand";
import { ProductGrid } from "@/components/zuma/product/ProductGrid";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";
import { getCollab } from "@/content/collabs";
import NotFound from "@/pages/NotFound";

// Page d'une collab (/collab/bde-asclepios). N'affiche QUE les produits
// dont products.collab correspond au slug — les produits 100 % ZÜMA
// restent sur /shop et sur l'accueil.
const Collab = () => {
  const { slug } = useParams<{ slug: string }>();
  const collab = getCollab(slug);
  const { products, loading } = useProducts();
  const { lang } = useLang();

  useEffect(() => {
    if (collab) document.title = `${collab.name} | ZÜMA`;
  }, [collab]);

  if (!collab) return <NotFound />;

  const collabProducts = products.filter((p) => p.collab === collab.slug);

  return (
    <SiteLayout>
      <div className="pt-44 md:pt-40 pb-20 px-6 md:px-10">
        <div className="mb-12 border-b border-border pb-6">
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.2em] text-foreground">
            {collab.name}
          </h1>
          <p className="mt-3 text-[10px] tracking-[0.18em] uppercase text-muted-foreground max-w-[520px]">
            {collab.tagline[lang]}
          </p>
        </div>

        {!loading && collabProducts.length === 0 ? (
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {collab.empty[lang]}
          </p>
        ) : (
          <ProductGrid products={collabProducts} loading={loading} />
        )}
      </div>

      <TextureBand label={collab.name} right="↓ Collab" ghost="COLLAB" />
    </SiteLayout>
  );
};

export default Collab;
