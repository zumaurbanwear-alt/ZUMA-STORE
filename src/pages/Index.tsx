import { useEffect, useState } from "react";
import heroImg from "@/assets/zuma-hero.jpg";
import { Loader } from "@/components/zuma/Loader";
import { Nav } from "@/components/zuma/Nav";
import { Countdown } from "@/components/zuma/Countdown";
import { TextureBand } from "@/components/zuma/TextureBand";
import { ProductGrid } from "@/components/zuma/ProductGrid";
import { CartDrawer, type CartItem } from "@/components/zuma/CartDrawer";
import { CheckoutDialog } from "@/components/zuma/CheckoutDialog";
import { WhatsAppFab } from "@/components/zuma/WhatsAppFab";
import { Footer } from "@/components/zuma/Footer";
import { useProducts, type DbProduct } from "@/hooks/useProducts";

export const WHATSAPP_NUMBER = "212600000000"; // ← replace with real number
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const Index = () => {
  const { products, loading } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    document.title = "ZÜMA — Drop 001 | Streetwear Born Between";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "ZÜMA — modular streetwear drops. Cash on delivery. WhatsApp confirmation. Born between Casablanca and elsewhere.");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting && e.target.classList.add("visible"));
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addToCart = (p: DbProduct) => {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i);
      return [...c, { ...p, qty: 1 }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: string, qty: number) =>
    setCart(c => qty <= 0 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? { ...i, qty } : i));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Loader />
      <Nav cartCount={cartCount} onCartClick={() => setCartOpen(true)} />

      <header id="hero" className="relative h-screen overflow-hidden flex flex-col justify-end px-6 md:px-10 pb-14 border-b border-border">
        <div className="absolute inset-0 bg-cover bg-center animate-hero-reveal" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <div className="text-[8px] tracking-[0.25em] text-primary-hi mb-3 animate-fade-up" style={{ animationDelay: "2.5s" }}>001 / STORE</div>
            <h1 className="font-display text-3xl md:text-5xl text-foreground animate-fade-up" style={{ animationDelay: "2.7s" }}>ZÜMA — DROP 001</h1>
            <p className="max-w-sm text-[10px] md:text-xs leading-[1.95] tracking-wide text-muted-foreground mt-3 animate-fade-up" style={{ animationDelay: "2.9s" }}>
              This is actually the store. Every mark, every choice, every silence — ready to be worn.
            </p>
          </div>
          <a href="https://zumaurbanwear-alt.github.io/ZUMA-INDEX/" target="_blank" rel="noreferrer" className="self-start md:self-auto inline-block text-[10px] tracking-[0.22em] uppercase px-4 py-2 border border-primary text-primary-hi hover:bg-primary hover:text-primary-foreground transition-colors animate-fade-up" style={{ animationDelay: "3.1s" }}>
            Enter Index →
          </a>
        </div>
      </header>

      <Countdown targetIso="2026-08-15T00:00:00" headline="IPSEITY — INCOMING" />

      <TextureBand label="DROP 001 — New Arrivals" right="↓ New Arrivals" ghost="NEW ARRIVALS" />

      <section id="products" className="px-6 md:px-10 py-20 border-b border-border reveal">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl tracking-[0.35em] text-foreground mb-3">SHOP</h2>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">New arrivals first · Live inventory</p>
        </div>
        <ProductGrid products={products} onAdd={addToCart} loading={loading} />
      </section>

      <TextureBand label="DROP 000 — Archive" right="↓ Archive" ghost="ARCHIVE" />

      <section id="archive" className="px-6 md:px-10 py-20 border-b border-border reveal text-center">
        <a href="#" className="inline-block px-6 py-3 border border-primary text-primary text-[10px] tracking-[0.2em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
          View Archive
        </a>
      </section>

      <Footer />
      <WhatsAppFab href={WHATSAPP_LINK} />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} whatsappLink={WHATSAPP_LINK} />
      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart}
        whatsappNumber={WHATSAPP_NUMBER}
        onSuccess={() => { setCart([]); setCheckoutOpen(false); }} />
    </div>
  );
};

export default Index;
