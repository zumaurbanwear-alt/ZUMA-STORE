import { useLang } from "@/context/LanguageContext";

export const Footer = () => {
  const { t } = useLang();
  return (
  <footer className="py-14 px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-t border-border relative overflow-hidden">
    <div>
      <div className="font-display text-[18px] tracking-[0.3em] text-foreground">
        ZÜMA
      </div>
      <span className="block font-mono text-[8px] tracking-[0.16em] text-muted-foreground font-normal mt-2">
        {t("footerTagline")}
      </span>
    </div>

    <div className="text-left md:text-right relative z-[2]">
      <div className="flex gap-4 mb-2">
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
            className="text-[8px] tracking-[0.16em] text-muted-foreground uppercase no-underline hover:text-primary-hi transition-colors"
          >
            {s.label}
          </a>
        ))}
      </div>
      <p className="text-primary-hi text-[8px] tracking-[0.16em] uppercase">
        This is the store.
      </p>
    </div>
  </footer>
  );
};
