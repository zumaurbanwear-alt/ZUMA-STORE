export const Footer = () => (
  <footer className="px-6 md:px-10 py-14 flex flex-col md:flex-row md:justify-between md:items-end gap-8 border-t border-border">
    <div>
      <div className="font-display text-lg tracking-[0.3em] text-foreground">ZÜMA</div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2 max-w-xs leading-relaxed">
        Brand born between Casablanca and elsewhere. We were made to create.
      </p>
    </div>
    <div className="flex flex-col md:items-end gap-3">
      <div className="flex gap-5 text-[10px] tracking-[0.22em] uppercase">
        <a href="https://www.instagram.com/zumaurbanwear" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary-hi">Instagram</a>
        <a href="https://www.tiktok.com/@zumaurbanwear" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary-hi">TikTok</a>
        <a href="https://wa.me/message/KOH2ZXZY6EPHP1" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary-hi">WhatsApp</a>
      </div>
      <p className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">© {new Date().getFullYear()} ZÜMA — This is the store.</p>
    </div>
  </footer>
);
