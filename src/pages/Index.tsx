import { useEffect } from "react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/fw000-modeled.jpg";
import { Loader } from "@/components/zuma/Loader";
import { Countdown } from "@/components/zuma/Countdown";
import { TextureBand } from "@/components/zuma/TextureBand";
import { ProductGrid } from "@/components/zuma/ProductGrid";
import { SiteLayout } from "@/components/zuma/SiteLayout";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";

const Index = () => {
  const { products, loading } = useProducts();
  const { t } = useLang();

  useEffect(() => {
    document.title = "ZÜMA — SHOP";
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

  return (
    <SiteLayout>
      <Loader />

      <header id="hero" className="relative h-screen overflow-hidden flex flex-col justify-end px-6 md:px-10 pb-14 border-b border-border">
        <div className="absolute inset-0 bg-cover animate-hero-reveal" style={{ backgroundImage: `url(${heroImg})`, backgroundPosition: "center 15%" }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <div className="text-[8px] tracking-[0.25em] text-primary-hi mb-3 animate-fade-up" style={{ animationDelay: "2.5s" }}>001 / {t("store")}</div>
            <h1 className="font-display text-foreground animate-fade-up" style={{ animationDelay: "2.7s", fontSize: "clamp(11px,1.4vw,16px)", letterSpacing: "0.35em" }}>ZÜMA — {t("store")}</h1>
            <p className="max-w-[340px] text-[9px] leading-[1.95] tracking-[0.04em] text-muted-foreground mt-3 animate-fade-up" style={{ animationDelay: "2.9s" }}>
              {t("storeTagline")}
            </p>
          </div>
          <a href="https://zumaurbanwear-alt.github.io/ZUMAINDEX/" target="_blank" rel="noreferrer" className="self-start md:self-auto inline-block text-[7px] tracking-[0.22em] uppercase px-4 py-2 border border-primary text-primary-hi hover:bg-primary hover:text-primary-foreground transition-colors animate-fade-up" style={{ animationDelay: "3.1s" }}>
            {t("enterIndex")}
          </a>
        </div>
      </header>

      <Countdown targetIso="2026-08-01T00:00:00" headline={t("incoming")} />

      <TextureBand label={t("drop001")} right={t("arrowNew")} ghost={t("newArrivals").toUpperCase()} />

      <section id="products" className="px-6 md:px-10 py-20 border-b border-border reveal">
        <div className="flex justify-between items-end mb-12 gap-4">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-primary-hi mb-3">{t("new").toUpperCase()}</div>
            <h2 className="font-display text-foreground" style={{ fontSize: "clamp(36px, 6vw, 72px)", letterSpacing: "0.12em" }}>
              {t("newArrivals").toUpperCase()}
            </h2>
          </div>
          <Link to="/shop" className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-primary-hi transition-colors whitespace-nowrap">
            {t("viewAll")} →
          </Link>
        </div>
        <ProductGrid products={products} loading={loading} showFilters={false} limit={4} />
      </section>

      <TextureBand label={t("drop000")} right={t("arrowArchive")} ghost="ARCHIVE" />

      <section id="archive" className="px-6 md:px-10 py-20 border-b border-border reveal text-center">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">ARCHIVE</div>
          <h2 className="font-display text-foreground mb-6" style={{ fontSize: "clamp(36px, 6vw, 72px)", letterSpacing: "0.12em" }}>
            {t("pastDrops").toUpperCase()}
          </h2>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{t("comingSoon")}</p>
        </div>
      </section>
    </SiteLayout>
  );
};

export default Index;
