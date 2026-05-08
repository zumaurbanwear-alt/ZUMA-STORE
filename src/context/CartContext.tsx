import { createContext, useContext, useState, ReactNode } from "react";
import type { DbProduct } from "@/hooks/useProducts";
import type { CartItem } from "@/components/zuma/CartDrawer";

type Variant = { size?: string; color?: string };

type Ctx = {
  cart: CartItem[];
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (b: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (b: boolean) => void;
  addToCart: (p: DbProduct, variant?: Variant) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const addToCart = (p: DbProduct, variant?: Variant) => {
    setCart(c => {
      const key = `${p.id}|${variant?.size ?? ""}|${variant?.color ?? ""}`;
      const ex = c.find(i => `${i.id}|${i.size ?? ""}|${i.color ?? ""}` === key);
      if (ex) return c.map(i => i === ex ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i);
      return [...c, { ...p, qty: 1, size: variant?.size, color: variant?.color }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: string, qty: number) =>
    setCart(c => qty <= 0 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? { ...i, qty } : i));
  const clear = () => setCart([]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ cart, cartCount, cartOpen, setCartOpen, checkoutOpen, setCheckoutOpen, addToCart, updateQty, clear }}>
      {children}
    </CartCtx.Provider>
  );
};

export const useCart = () => {
  const v = useContext(CartCtx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
};
