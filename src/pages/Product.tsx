import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { resolveImage, transformImage, useProducts, useProductImages } from "@/hooks/useProducts";
import { ProductCard } from "@/components/zuma/ProductGrid";
import { ProductImg } from "@/components/zuma/ProductImg";
import { ProductDetailSkeleton } from "@/components/zuma/ProductDetailSkeleton";
import { SiteLayout } from "@/components/zuma/SiteLayout";
import { WHATSAPP_NUMBER } from "@/lib/contactInfo";
import { useCart } from "@/context/CartContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { toast } from "sonner";

const SIZES = ["S", "M", "L"];
const COLORS = ["WHITE", "GREY", "BLACK"];

const setMeta = (selector: string, attr: "content", value: string) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

const Product = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const product = useMemo(() => products.find(p => p.slug === slug), [products, slug]);
  const { images } = useProductImages(product?.id);
  const { addToCart } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const availableColors = useMemo(() => {
    const present = new Set(
      images
        .filter(img => !!img.url)
        .map(img => img.color?.toUpperCase())
        .filter((c): c is string => !!c)
    );
    return COLORS.filter(c => present.has(c));
  }, [images]);

  useEffect(() => {
    if (color && !availableColors.includes(color)) {
      setColor(null);
    }
  }, [availableColors, color]);

  useEffect(() => {
    if (!product) return;
    const title = `ZÜMA — ${product.name}`;
    const description = (product.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    const image = resolveImage(product);

    document.title = title;
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);

    return () => {
      document.title = "ZÜMA — Store";
      setMeta('meta[property="og:title"]', "content", "ZÜMA — STORE");
      setMeta('meta[property="og:image"]', "content", "https://zumaurbanwear.store/og-image.jpg");
      setMeta('meta[name="twitter:title"]', "content", "ZÜMA — STORE");
      setMeta('meta[name="twitter:image"]', "content", "https://zumaurbanwear.store/og-image.jpg");
    };
  }, [product]);

  useEffect(() => {
    images.forEach(img => {
      const image = new Image();
      image.src = transformImage(img.url, 1000);
    });
  }, [images]);

  useEffect(() => {
    setSlide(0);
  }, [color]);

  const carouselImages = useMemo(() => {
    if (color && images.length > 0) {
      const colorImgs = images.filter(img => img.color?.toUpperCase() === color);
      const front = colorImgs.find(img => img.side === 'front');
      const back = colorImgs.find(img => img.side === 'back');
      const result = [];
      if (front) result.push(front.url);
      if (back) result.push(back.url);
      if (result.length > 0) return result;
    }
    return product ? [resolveImage(product)] : [];
  }, [color, images, product]);

  const currentImage = carouselImages[slide] ?? carouselImages[0] ?? "";

  const relatedProducts = useMemo(() => {
    if (!product?.collection) return [];
    return products
      .filter(p => p.id !== product.id && p.collection === product.collection)
      .sort((a, b) => {
        if ((a.stock === 0) !== (b.stock === 0)) return a.stock === 0 ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [products, product]);

  if (loading) {
    return (
      <SiteLayout>
        <ProductDetailSkeleton />
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-20 px-6 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">{t("productNotFound")}</p>
          <Link to="/shop" className="inline-block px-5 py-2.5 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
            {t("backToShop")}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const soldOut = product.stock === 0;
  const producedDate = product.created_at
    ? new Date(product.created_at)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
        .replace(/\//g, ".")
    : null;
  const waMsg = encodeURIComponent(
    `Hi ZÜMA, I'd like to ask about: ${product.name}${size ? ` (size ${size})` : ""}${color ? ` (${color})` : ""}.`
  );

  return (
    <SiteLayout>
      <div style={{ paddingTop: "120px", paddingBottom: "80px" }} className="px-6 md:px-10 flex-1">
        <div className="max-w-[1200px] mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi transition-colors mb-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {t("back")}
          </button>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-stretch">
            <div className="relative md:h-full">
              <div className="relative border border-border w-full aspect-[4/5] md:aspect-auto md:h-full overflow-hidden">
                <ProductImg
                  src={currentImage}
                  width={1000}
                  alt={product.name}
                  loading="eager"
                  fetchPriority="high"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${soldOut ? "opacity-40 grayscale" : ""}`}
                />
                {carouselImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setSlide(s => (s - 1 + carouselImages.length) % carouselImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background p-1 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={() => setSlide(s => (s + 1) % carouselImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background p-1 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                  </>
                )}
              </div>
              {carouselImages.length > 1 && (
                <div className="relative md:absolute left-0 right-0 md:top-full mt-3 flex gap-2">
                  {carouselImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`border aspect-square w-16 overflow-hidden transition-all ${slide === i ? "border-foreground" : "border-border opacity-50"}`}
                      style={{ background: "hsl(var(--card))" }}
                    >
                      <ProductImg src={url} width={128} alt={`${product.name} — view ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div>
  <h1 className="font-display text-foreground" style={{ fontSize: "clamp(20px, 3.5vw, 42px)", letterSpacing: "0.12em" }}>
    {product.name}
  </h1>
                {product.collection && (
                  <div className="text-[9px] tracking-[0.25em] uppercase text-primary-hi mt-2">
                    {product.collection}
                  </div>
                )}
                <div className="font-display text-[16px] tracking-[0.18em] text-primary-hi mt-2">
                  {product.price} MAD
                </div>
              </div>

              {product.description && (
  <p className="text-[10px] leading-[1.95] tracking-[0.04em] text-muted-foreground max-w-md">
    {product.description}
  </p>
)}

{(product.material || product.origin || product.archive_ref) && (
  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-[9px] tracking-[0.15em] uppercase border-t border-border pt-4 max-w-md">
    {product.material && (
      <>
        <dt className="text-muted-foreground">Material</dt>
        <dd className="text-foreground">{product.material}</dd>
      </>
    )}
    {product.origin && (
      <>
        <dt className="text-muted-foreground">Origin</dt>
        <dd className="text-foreground">{product.origin}</dd>
      </>
    )}
    {product.archive_ref && (
      <>
        <dt className="text-muted-foreground">Archive Ref</dt>
        <dd className="text-foreground">{product.archive_ref}</dd>
      </>
    )}
    {producedDate && (
      <>
        <dt className="text-muted-foreground">Produced</dt>
        <dd className="text-foreground">{producedDate}</dd>
      </>
    )}
    <dt className="text-muted-foreground">Classification</dt>
    <dd className="text-foreground">{product.category}</dd>
  </dl>
)}

<div>
  <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{t("selectSize")}</div>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-4 py-2 text-[9px] tracking-[0.22em] uppercase border transition-colors ${
                        size === s
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {availableColors.length > 0 && (
                <div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{t("selectColor")}</div>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`px-4 py-2 text-[9px] tracking-[0.22em] uppercase border transition-colors ${
                          color === c
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  disabled={soldOut || !size || !color}
                  onClick={() => {
                    if (!size) { toast.error(t("selectSize")); return; }
                    if (!color) { toast.error(t("selectColor")); return; }
                    addToCart(product, { size, color });
                  }}
                  className="w-full py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {soldOut ? t("soldOut") : t("addToCart")}
                </button>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi hover:border-primary-hi transition-colors"
                >
                  {t("askWhatsApp")}
                </a>
                {product.archive_url && (
                  <a
                    href={product.archive_url}
                    className="w-full text-center py-2 mt-1 text-[9px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi transition-colors border-t border-border pt-3"
                  >
                    {t("openArchive")}
                  </a>
                )}
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-20 pt-12 border-t border-border">
              <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {t("relatedEntries")}
                </h2>
                {product.collection && (
                  <span className="text-[9px] tracking-[0.25em] uppercase text-primary-hi">
                    {product.collection}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-[600px]">
                {relatedProducts.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
};

export default Product;
