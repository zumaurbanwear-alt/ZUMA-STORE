import { useState, ReactNode } from "react";
import { Nav } from "@/components/zuma/Nav";
import { Footer } from "@/components/zuma/Footer";
import { CartDrawer } from "@/components/zuma/CartDrawer";
import { CheckoutDialog } from "@/components/zuma/CheckoutDialog";
import { EmailGate } from "@/components/zuma/EmailGate";
import { useCart } from "@/context/CartContext";
import { WHATSAPP_NUMBER, WHATSAPP_LINK } from "@/lib/contactInfo";

const STORAGE_KEY = "zuma_email_gate_passed";

export const SiteLayout = ({ children }: { children: ReactNode }) => {
  const { cart, cartCount, cartOpen, setCartOpen, checkoutOpen, setCheckoutOpen, updateQty, clear } = useCart();
  const [passed, setPassed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {!passed && <EmailGate onPass={() => setPassed(true)} />}
      <Nav cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      {children}
      <Footer />
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