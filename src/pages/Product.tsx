import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { resolveImage, useProducts } from "@/hooks/useProducts";
import { SiteLayout, WHATSAPP_NUMBER } from "@/components/zuma/SiteLayout";
import { useCart } from "@/context/CartContext";
import { ChevronLeft } from "lucide-react";

const SIZES = ["S", "M", "L"];
const COLORS = ["WHITE", "GREY", "BLACK"];

const Product = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const product = useMemo(() => products.find(p => p.slug === slug), [products, slug]);
  const { addToCart } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (product) document.title = `ZÜMA — ${product.name}`;
  }, [product]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-20 px-6 text-center text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Loading product...
        </div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-20 px-6 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">Product not found</p>
          <Link to="/shop" className="inline-block px-5 py-2.5 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
            Back to shop
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
      <div style={{ paddingTop: "100px", paddingBottom: "80px" }} className="px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi transition-colors mb-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start max-h-[80vh]">
            <div className="bg-card border border-border aspect-[4/5] overflow-hidden">
              <img
                src={resolveImage(product)}
                alt={product.name}
                className={`w-full h-full object-cover ${soldOut ? "opacity-40 grayscale" : ""}`}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[9px] tracking-[0.25em] uppercase text-primary-hi mb-2">
                  {product.category}
                </div>
                <h1 className="font-display text-foreground" style={{ fontSize: "clamp(20px, 3.5vw, 42px)", letterSpacing: "0.12em" }}>
                  {product.name}
                </h1>
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
                <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">SELECT SIZE</div>
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
                <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">SELECT COLOR</div>
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
                  onClick={() => addToCart(product)}
                  className="w-full py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {soldOut ? "Sold Out" : "Add to Cart"}
                </button>
                
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center py-3 border border-border text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-primary-hi hover:border-primary-hi transition-colors"
                >
                  Ask via WhatsApp
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
