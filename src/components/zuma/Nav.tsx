import { ShoppingBag } from "lucide-react";

export const Nav = ({ cartCount, onCartClick }: { cartCount: number; onCartClick: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-start px-6 md:px-10 py-7">
    <a href="#" className="font-display text-lg tracking-[0.3em] text-foreground animate-fade-up" style={{ animationDelay: "2.8s" }}>
      ZÜMA
    </a>
    <div className="flex items-center gap-6 animate-fade-up" style={{ animationDelay: "3s" }}>
      <div className="hidden md:flex flex-col items-end gap-1 text-[8px] tracking-[0.22em] uppercase text-muted-foreground">
        <a href="#products" className="hover:text-primary-hi transition-colors">Shop</a>
        <a href="#archive" className="hover:text-primary-hi transition-colors">Archive</a>
        <a href="https://www.instagram.com/zumaurbanwear" target="_blank" rel="noreferrer" className="hover:text-primary-hi transition-colors">Instagram</a>
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
