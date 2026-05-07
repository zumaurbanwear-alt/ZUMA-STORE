import { X, Minus, Plus } from "lucide-react";
import { resolveImage, type DbProduct } from "@/hooks/useProducts";
import { useLang } from "@/context/LanguageContext";
export type CartItem = DbProduct & { qty: number };
export const CartDrawer = ({
  open, onClose, cart, updateQty, onCheckout, whatsappLink,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQty: (id: string, qty: number) => void;
  onCheckout: () => void;
  whatsappLink: string;
}) => {
  const { t } = useLang();
  const total = cart.reduce((s, i) => s + i.qty * Number(i.price), 0);
  return (
    <>
      <div
        className={`fixed inset-0 bg-background/80 z-[200] transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-[201] flex flex-col transition-transform duration-500 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex justify-between items-center px-6 py-5 border-b border-border">
          <h2 className="font-display text-sm tracking-[0.3em]">{t("cart")}</h2>
          <button onClick={onClose} aria-label="Close cart" className="text-muted-foreground hover:text-primary-hi">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground text-center mt-12">{t("cartEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {cart.map(item => (
                <li key={item.id} className="flex gap-4 border-b border-border pb-5">
                  <img src={resolveImage(item)} alt={item.name} className="w-16 h-20 object-cover" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-display text-[11px] tracking-[0.18em]">{item.name}</div>
                      <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-1">{item.category}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center border border-border">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1 hover:text-primary-hi"><Minus className="w-3 h-3" /></button>
                        <span className="px-3 text-[10px]">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, Math.min(item.qty + 1, item.stock))} className="px-2 py-1 hover:text-primary-hi"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-[10px] text-primary-hi">{Number(item.price) * item.qty} MAD</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border px-6 py-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{t("total")}</span>
            <span className="font-display text-sm tracking-[0.1em]">{total} MAD</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={onCheckout}
            className="w-full py-3 bg-primary text-primary-foreground text-[10px] tracking-[0.3em] uppercase hover:bg-primary-hi transition-colors disabled:opacity-40"
          >
            {t("checkout")}
          </button>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="w-full text-center py-2.5 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi hover:border-primary-hi transition-colors"
          >
            {t("orderWhatsApp")}
          </a>
        </footer>
      </aside>
    </>
  );
};
