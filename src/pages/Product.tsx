import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { resolveImage, useProducts, useProductImages } from "@/hooks/useProducts";
import { SiteLayout, WHATSAPP_NUMBER } from "@/components/zuma/SiteLayout";
import { useCart } from "@/context/CartContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { toast } from "sonner";

const SIZES = ["S", "M", "L"];
const COLORS = ["WHITE", "GREY", "BLACK"];

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

  useEffect(() => {
    if (product) document.title = `ZÜMA — ${product.name}`;
  }, [product]);

  // Précharger toutes les images
  useEffect(() => {
    images.forEach(img => {
      const image = new Image();
      image.src = img.url;
    });
  }, [images]);

  // Reset slide when color changes
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

  if (loading) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-20 px-6 text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">
          {t("loadingProduct")}
        </div>
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
                <img
                  src={currentImage}
                  alt={product.name}
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
                      style={{ background: "#DBDBD0" }}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-primary-hi mb-2">
                  {product.category}
                </div>
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

              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{t("selectColor")}</div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
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

              <div className="flex flex-col gap-2 pt-2">
                <button
                  disabled={soldOut}
                  onClick={() => addToCart(product, { size: size ?? undefined, color: color ?? undefined })}
                  className="w-full py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {soldOut ? t("soldOut") : t("addToCart")}
                </button>
                
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi hover:border-primary-hi transition-colors"
                >
                  {t("askWhatsApp")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};

export default Product;
