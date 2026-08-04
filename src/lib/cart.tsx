import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
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
};

export type Fulfillment = "shipping" | "pickup";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  promo: string | null;
  applyPromo: (code: string) => { ok: boolean; message: string };
  discount: number;
  fulfillment: Fulfillment;
  setFulfillment: (value: Fulfillment) => void;
};

const STORAGE_KEY = "jmb2-cart-v1";

export const PROMO_CODES: Record<string, number> = {
  WELCOME10: 0.1,
  MAKER15: 0.15,
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("shipping");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    setItems((prev) => {
      const key = [item.productId, item.color, item.option, item.personalization].join("|");
      const existing = prev.find(
        (i) => [i.productId, i.color, i.option, i.personalization].join("|") === key,
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, { ...item, id: `${item.productId}-${Date.now()}` }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(99, quantity)) } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, message: "Enter a promo code." };
    const rate = PROMO_CODES[normalized];
    if (!rate) {
      return { ok: false, message: `“${normalized}” isn't a valid demo code.` };
    }
    setPromo(normalized);
    return {
      ok: true,
      message: `Demo code ${normalized} applied — ${Math.round(rate * 100)}% off.`,
    };
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const discount = promo ? subtotal * (PROMO_CODES[promo] ?? 0) : 0;

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      promo,
      applyPromo,
      discount,
      fulfillment,
      setFulfillment,
    }),
    [
      items,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      promo,
      applyPromo,
      discount,
      fulfillment,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}