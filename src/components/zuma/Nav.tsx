import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";

export const Nav = ({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) => {
  const { lang, setLang, t } = useLang();
  const linkCls = "text-[8px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi transition-colors";
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-start px-6 md:px-10 py-7">
      <Link to="/" className="font-display text-lg tracking-[0.3em] text-foreground">
        ZÜMA
      </Link>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex flex-col items-end gap-1">
          <Link to="/shop" className={linkCls}>{t("shop")}</Link>
          <a href="https://zumaurbanwear-alt.github.io/ZUMA-INDEX/" target="_blank" rel="noreferrer" className={linkCls}>{t("indexNav")}</a>
          <Link to="/#archive" className={linkCls}>{t("archive")}</Link>
          <a href="https://www.instagram.com/zumaurbanwear" target="_blank" rel="noreferrer" className={linkCls}>{t("instagram")}</a>
          <button
            onClick={() => setLang(lang === "EN" ? "FR" : "EN")}
            className={`${linkCls} flex gap-1`}
            aria-label="Toggle language"
          >
            <span className={lang === "EN" ? "text-primary-hi" : ""}>EN</span>
            <span>/</span>
            <span className={lang === "FR" ? "text-primary-hi" : ""}>FR</span>
          </button>
        </div>
        <button
          onClick={onCartClick}
          className="relative text-foreground hover:text-primary-hi transition-colors"
          aria-label="Open cart"
        >
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
