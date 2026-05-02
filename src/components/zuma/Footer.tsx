export const Footer = () => (
  <footer className="bg-background border-t border-border px-6 md:px-10 pt-16 pb-6">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 pb-10">
        <div>
          <div className="font-display text-4xl md:text-5xl tracking-[0.15em] text-foreground">ZÜMA</div>
          <p className="text-xs text-muted-foreground mt-5 max-w-xs leading-relaxed lowercase">
            brand born between casablanca and elsewhere. we were made to create.
          </p>
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
              className="text-[8px] tracking-[0.16em] text-muted-foreground uppercase no-underline hover:text-accent transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
        <p className="text-accent text-[8px] tracking-[0.16em] uppercase">
          This is the store.
        </p>
      </div>
      </div>
      
    </div>
  </footer>
);
