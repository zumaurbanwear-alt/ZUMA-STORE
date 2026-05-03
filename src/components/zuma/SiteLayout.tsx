import { ReactNode } from "react";
import { Nav } from "@/components/zuma/Nav";
import { Footer } from "@/components/zuma/Footer";
import { CartDrawer } from "@/components/zuma/CartDrawer";
import { CheckoutDialog } from "@/components/zuma/CheckoutDialog";
import { WhatsAppFab } from "@/components/zuma/WhatsAppFab";
import { useCart } from "@/context/CartContext";

export const WHATSAPP_NUMBER = "212600000000";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export const SiteLayout = ({ children }: { children: ReactNode }) => {
  const { cart, cartCount, cartOpen, setCartOpen, checkoutOpen, setCheckoutOpen, updateQty, clear } = useCart();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      {children}
      <Footer />
      <WhatsAppFab href={WHATSAPP_LINK} />
      <CartDrawer
        open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        whatsappLink={WHATSAPP_LINK}
      />
      <CheckoutDialog
        open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart}
        whatsappNumber={WHATSAPP_NUMBER}
        onSuccess={() => { clear(); setCheckoutOpen(false); }}
      />
    </div>
  );
};
