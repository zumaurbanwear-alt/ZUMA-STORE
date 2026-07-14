import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useAudio } from "@/context/AudioContext";

export const Nav = ({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) => {
  const { lang, setLang, t } = useLang();
  const { playing, toggle } = useAudio();
  const linkCls = "text-[8px] tracking-[0.22em] uppercase text-foreground hover:text-primary-dim transition-colors";
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-start px-6 md:px-10 py-7 pointer-events-none">
      <Link to="/" className="font-display text-lg tracking-[0.3em] text-foreground pointer-events-auto">
        ZÜMA
      </Link>
      <div className="flex items-center gap-4 md:gap-6 pointer-events-auto">
        <div className="flex flex-col items-end gap-1">
          <Link to="/shop" className={linkCls}>{t("shop")}</Link>
          <a href="https://zumaurbanwear-alt.github.io/ZUMA-INDEX/" target="_blank" rel="noreferrer" className={linkCls}>{t("indexNav")}</a>
          <Link to="/#archive" className={linkCls}>{t("archive")}</Link>
          <a href="https://www.instagram.com/zumaurbanwear" target="_blank" rel="noreferrer" className={linkCls}>{t("instagram")}</a>
          <button
            onClick={toggle}
            className={linkCls}
            aria-label={playing ? "Mute sound" : "Play sound"}
          >
            {playing ? "SOUND ON" : "SOUND OFF"}
          </button>
          <button
            onClick={() => setLang(lang === "EN" ? "FR" : "EN")}
            className="mt-0.5 flex items-center border border-foreground/70 hover:border-foreground transition-colors"
            aria-label="Toggle language"
          >
            <span
              className={`px-2 py-1 text-[9px] tracking-[0.22em] uppercase transition-colors ${
                lang === "EN"
                  ? "bg-foreground text-background"
                  : "text-foreground/60"
              }`}
            >
              EN
            </span>
            <span
              className={`px-2 py-1 text-[9px] tracking-[0.22em] uppercase transition-colors border-l border-foreground/70 ${
                lang === "FR"
                  ? "bg-foreground text-background"
                  : "text-foreground/60"
              }`}
            >
              FR
            </span>
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
