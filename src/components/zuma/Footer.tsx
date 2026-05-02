export const Footer = () => (
      <footer className="border-t border-grey-deep px-6 md:px-10 py-12 md:py-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative overflow-hidden">
      {/* Brand */}
      <div>
        <p className="font-display text-[18px] tracking-[0.3em] text-light">ZÜMA</p>
        <p className="font-mono text-[8px] tracking-[0.2em] text-grey-text mt-2 lowercase max-w-xs leading-relaxed">
          {tx.tagline}
        </p>
      </div>

      {/* Right */}
      <div className="text-left md:text-right relative z-10">
        <div className="flex gap-4 mb-2">
          <a
            href="https://www.instagram.com/zumaurbanwear?igsh=MWdtNWJkbHEwOHBhdQ%3D%3D&utm_source=qr"
            target="_blank" rel="noopener noreferrer"
            className="text-[8px] tracking-[0.16em] uppercase text-grey-text hover:text-crimson-hi transition-colors duration-0"
          >
            Instagram
          </a>
          <a
            href="https://www.tiktok.com/@zumaurbanwear?is_from_webapp=1&sender_device=pc"
            target="_blank" rel="noopener noreferrer"
            className="text-[8px] tracking-[0.16em] uppercase text-grey-text hover:text-crimson-hi transition-colors duration-0"
          >
            TikTok
          </a>
          <a
            href="https://wa.me/212600365283"
            target="_blank" rel="noopener noreferrer"
            className="text-[8px] tracking-[0.16em] uppercase text-grey-text hover:text-crimson-hi transition-colors duration-0"
          >
            WhatsApp
          </a>
        </div>
        <p className="text-[8px] tracking-[0.16em] uppercase text-crimson-hi">{tx.note}</p>
        <p className="text-[8px] tracking-[0.12em] text-grey-text mt-1">
          © {new Date().getFullYear()} ZÜMA
        </p>
      </div>
    </footer>
);
