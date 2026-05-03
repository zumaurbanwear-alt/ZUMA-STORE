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

  const addToCart = (p: DbProduct) => {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i);
      return [...c, { ...p, qty: 1 }];
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
