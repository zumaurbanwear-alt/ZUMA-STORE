import { useEffect } from "react";
import { Link } from "react-router-dom";
import heroDesktopWebp from "@/assets/fw000/modeled-desktop.webp";
import heroDesktopJpg from "@/assets/fw000/modeled-desktop.jpg";
import heroMobileWebp from "@/assets/fw000/modeled-mobile.webp";
import heroMobileJpg from "@/assets/fw000/modeled-mobile.jpg";
import { Countdown } from "@/components/zuma/marketing/Countdown";
import { TextureBand } from "@/components/zuma/layout/TextureBand";
import { ProductGrid } from "@/components/zuma/product/ProductGrid";
import { NewsletterBand } from "@/components/zuma/marketing/NewsletterBand";
import { OptimizedImage } from "@/components/zuma/common/OptimizedImage";

import { SiteLayout } from "@/components/zuma/layout/SiteLayout";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";

const Index = () => {
  const { products, loading } = useProducts();
  const { t } = useLang();

  useEffect(() => {
    document.title = "ZÜMA — STORE";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "ZÜMA — documented garments. Origin: Casablanca, Morocco. Cash on delivery. WhatsApp confirmation.");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting && e.target.classList.add("visible"));
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <SiteLayout>
      <header id="hero" className="relative h-screen overflow-hidden flex flex-col justify-end px-6 md:px-10 pb-14 border-b border-border">
        <picture>
          {/* Phones get the small crop; anything wider gets the full-size one.
              WebP first (smaller, and what most browsers use today), JPEG
              as the fallback for the rare browser without WebP support. */}
          <source media="(max-width: 767px)" srcSet={heroMobileWebp} type="image/webp" />
          <source srcSet={heroDesktopWebp} type="image/webp" />
          <OptimizedImage
            src={heroDesktopJpg}
            srcSet={`${heroMobileJpg} 750w, ${heroDesktopJpg} 1400w`}
            alt=""
            width={1400}
            className="absolute inset-0 w-full h-full object-cover animate-hero-reveal"
            style={{ objectPosition: "center 15%" }}
            loading="eager"
            fetchPriority="high"
            priority
            sizes="100vw"
            fallbackSrc={heroDesktopJpg}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <div className="text-[8px] tracking-[0.25em] text-primary-hi mb-3 animate-fade-up" style={{ animationDelay: "0.4s" }}>001 / {t("store")}</div>
            <h1 className="font-display text-foreground animate-fade-up" style={{ animationDelay: "0.5s", fontSize: "clamp(11px,1.4vw,16px)", letterSpacing: "0.35em" }}>ZÜMA — {t("store")}</h1>
            <p className="max-w-[340px] text-[9px] leading-[1.95] tracking-[0.04em] text-muted-foreground mt-3 animate-fade-up" style={{ animationDelay: "0.6s" }}>
              {t("storeTagline")}
            </p>
          </div>
          <a href="https://zumaurbanwear-alt.github.io/ZUMA-INDEX/" target="_blank" rel="noreferrer" className="self-start md:self-auto inline-block text-[7px] tracking-[0.22em] uppercase px-4 py-2 border border-primary text-primary-hi hover:bg-primary hover:text-primary-foreground transition-colors animate-fade-up" style={{ animationDelay: "0.7s" }}>
            {t("enterIndex")}
          </a>
        </div>
      </header>

      <TextureBand label={t("drop001")} right={t("arrowNew")} ghost="RECORD" />

      <section id="products" className="px-6 md:px-10 py-20 border-b border-border reveal">
        <div className="flex justify-between items-baseline mb-12 border-b border-border pb-3">
  <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
    ENTRIES — {products.length.toString().padStart(3, "0")}
  </span>
  <Link to="/shop" className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
    {t("viewAll")} →
  </Link>
</div>
        <ProductGrid products={products} loading={loading} showFilters={false} limit={4} />
      </section>

      <TextureBand label={t("drop000")} right={t("arrowArchive")} ghost="ARCHIVE" />

      <section id="archive" className="px-6 md:px-10 py-20 border-b border-border reveal">
  <div className="max-w-[1200px] mx-auto">
    <div className="flex justify-between items-baseline mb-6 border-b border-border pb-3">
      <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">ARCHIVE</span>
      <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{t("comingSoon")}</span>
    </div>
  </div>
</section>

      <NewsletterBand />
    </SiteLayout>
  );
};

export default Index;
