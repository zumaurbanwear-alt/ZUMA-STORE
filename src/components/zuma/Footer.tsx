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

        <div className="flex flex-col gap-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Connect</div>
          <a href="https://www.instagram.com/zumaurbanwear" target="_blank" rel="noreferrer" className="text-xs tracking-[0.22em] uppercase text-foreground hover:text-primary-hi transition-colors">Instagram ↗</a>
          <a href="https://www.tiktok.com/@zumaurbanwear" target="_blank" rel="noreferrer" className="text-xs tracking-[0.22em] uppercase text-foreground hover:text-primary-hi transition-colors">TikTok ↗</a>
          <a href="https://wa.me/message/KOH2ZXZY6EPHP1" target="_blank" rel="noreferrer" className="text-xs tracking-[0.22em] uppercase text-foreground hover:text-primary-hi transition-colors">WhatsApp ↗</a>
        </div>
      </div>

      <div className="border-t border-border pt-6 flex flex-col md:flex-row md:justify-between gap-2 text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
        <p>© {new Date().getFullYear()} zuma — all rights reserved</p>
        <p>system v2.0 // phase active</p>
      </div>
    </div>
  </footer>
);
