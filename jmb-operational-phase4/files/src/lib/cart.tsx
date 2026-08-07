import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  quantity: number;
  color?: string;
  option?: string;
  personalization?: string;
  note?: string;
  imageUrl?: string;
  weightOz?: number | null;
  lengthIn?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
};

type CartContextValue = {
  items: CartItem[];
  cart: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  removeLineItem: (productId: string) => void;
  clearCart: () => void;
  emptyCart: () => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  itemCount: number;
  count: number;
  totalItems: number;
  subtotal: number;
  total: number;
  totalPrice: number;
};

const STORAGE_KEY = "jmb-cart-v2";
const CartContext = createContext<CartContextValue | null>(null);

function readCart() {
  if (typeof window === "undefined") return [] as CartItem[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [] as CartItem[];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setItems(readCart()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, ready]);

  const addItem = (incoming: CartItem) => {
    const quantity = Math.max(1, Number(incoming.quantity) || 1);
    setItems((current) => {
      const index = current.findIndex((item) => item.productId === incoming.productId && (item.option ?? "") === (incoming.option ?? "") && (item.color ?? "") === (incoming.color ?? ""));
      if (index < 0) return [...current, { ...incoming, quantity }];
      return current.map((item, itemIndex) => itemIndex === index ? { ...item, ...incoming, quantity: item.quantity + quantity } : item);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const next = Math.max(0, Number(quantity) || 0);
    setItems((current) => next <= 0 ? current.filter((item) => item.productId !== productId) : current.map((item) => item.productId === productId ? { ...item, quantity: next } : item));
  };
  const removeItem = (productId: string) => setItems((current) => current.filter((item) => item.productId !== productId));
  const clearCart = () => setItems([]);
  const incrementItem = (productId: string) => setItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item));
  const decrementItem = (productId: string) => setItems((current) => current.flatMap((item) => item.productId !== productId ? [item] : item.quantity <= 1 ? [] : [{ ...item, quantity: item.quantity - 1 }]));

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const value: CartContextValue = {
    items,
    cart: items,
    addItem,
    updateQuantity,
    removeItem,
    removeLineItem: removeItem,
    clearCart,
    emptyCart: clearCart,
    incrementItem,
    decrementItem,
    itemCount,
    count: itemCount,
    totalItems: itemCount,
    subtotal,
    total: subtotal,
    totalPrice: subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}
