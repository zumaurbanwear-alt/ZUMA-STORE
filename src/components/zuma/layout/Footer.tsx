import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";

const linkCls = "text-[8px] tracking-[0.16em] text-muted-foreground uppercase no-underline hover:text-primary-hi transition-colors";

const FooterColumn = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2.5">
    <span className="text-[8px] tracking-[0.22em] uppercase text-foreground">{heading}</span>
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);

export const Footer = () => {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border relative overflow-hidden">
      <div className="py-10 md:py-14 px-6 md:px-10 flex flex-col md:flex-row justify-between gap-8 md:gap-12">
        <div className="max-w-[220px]">
          <div className="font-display text-[18px] tracking-[0.3em] text-foreground">
            ZÜMA
          </div>
          <span className="block font-mono text-[8px] tracking-[0.16em] text-muted-foreground font-normal mt-2">
            {t("footerTagline")}
          </span>
        </div>

        <nav className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-16" aria-label="Footer">
          <FooterColumn heading={t("footerShop")}>
            <Link to="/shop" className={linkCls}>{t("allEntries")}</Link>
            <Link to="/#archive" className={linkCls}>{t("archive")}</Link>
          </FooterColumn>

          <FooterColumn heading={t("footerInformation")}>
            <Link to="/faq" className={linkCls}>{t("faqNav")}</Link>
            <Link to="/shipping" className={linkCls}>{t("shippingNav")}</Link>
            <Link to="/returns" className={linkCls}>{t("returnsNav")}</Link>
            <Link to="/privacy" className={linkCls}>{t("privacyNav")}</Link>
            <Link to="/terms" className={linkCls}>{t("termsNav")}</Link>
            <Link to="/contact" className={linkCls}>{t("contactNav")}</Link>
          </FooterColumn>

          <FooterColumn heading={t("footerSystem")}>
            <a href="https://zumaurbanwear-alt.github.io/ZUMA-INDEX/" target="_blank" rel="noreferrer" className={linkCls}>{t("indexNav")}</a>
            <Link to="/#archive" className={linkCls}>{t("archive")}</Link>
          </FooterColumn>
        </nav>
      </div>

      <div className="px-6 md:px-10 py-5 border-t border-border flex flex-row justify-between items-center gap-3">
        <p className="text-[7px] sm:text-[8px] tracking-[0.12em] sm:tracking-[0.16em] text-muted-foreground uppercase">
          <Link to="/zm-portal-x92" className="no-underline text-inherit hover:text-inherit">©</Link> {year} ZÜMA. {t("footerRights")}
        </p>
        <div className="flex gap-2 sm:gap-4 shrink-0">
          {[
            { label: "Instagram", url: "https://www.instagram.com/zumaurbanwear" },
            { label: "TikTok", url: "https://www.tiktok.com/@zumaurbanwear" },
            { label: "WhatsApp", url: "https://wa.me/message/KOH2ZXZY6EPHP1" },
          ].map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkCls} text-[7px] sm:text-[8px] tracking-[0.12em] sm:tracking-[0.16em] whitespace-nowrap`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
