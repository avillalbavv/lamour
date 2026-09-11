"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast, Toaster } from "sonner";
import type { Store, CartLine, Product } from "@/lib/types";
import { api } from "@/lib/api";
type Context = {
  store: Store | null;
  loading: boolean;
  error: string;
  reload: () => void;
  cart: CartLine[];
  add: (p: Product, variant?: string | null, amount?: number) => void;
  quantity: (id: string, variant: string | null, n: number) => void;
  clear: () => void;
  favorites: string[];
  favorite: (id: string) => void;
  discreet: boolean;
  setDiscreet: (v: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
};
const C = createContext<Context>(null!);
export const useStore = () => useContext(C);
function saved<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [discreet, setDiscreetState] = useState(false);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  async function reload() {
    setError("");
    setLoading(true);
    try {
      setStore(await api<Store>("store"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const rows = saved<any>("lp-cart", []);
    setCart(
      Array.isArray(rows)
        ? rows.filter(
            (x: any) =>
              x &&
              typeof x.product_id === "string" &&
              Number.isInteger(x.quantity) &&
              x.quantity > 0 &&
              x.quantity <= 20,
          )
        : [],
    );
    const f = saved<any>("lp-favorites", []);
    setFavorites(
      Array.isArray(f) ? f.filter((x: any) => typeof x === "string") : [],
    );
    setDiscreetState(saved<boolean>("lp-discreet", false) === true);
    setReady(true);
    reload();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("lp-cart", JSON.stringify(cart));
        localStorage.setItem("lp-favorites", JSON.stringify(favorites));
        localStorage.setItem("lp-discreet", JSON.stringify(discreet));
      } catch {}
    }
  }, [cart, favorites, discreet, ready]);
  function add(p: Product, variant: string | null = null, amount = 1) {
    if (p.availability_type === "sold_out") {
      toast.error("Este producto está agotado.");
      return;
    }
    if (p.variants.some((v) => v.active) && !variant) {
      location.href = "/producto/" + p.slug;
      return;
    }
    const q = cart
      .filter((i) => i.product_id === p.id)
      .reduce((s, i) => s + i.quantity, 0);
    const v = p.variants.find((v) => v.id === variant);
    if (
      p.availability_type !== "on_order" &&
      (q + amount > p.stock_quantity ||
        (v &&
          (cart.find((i) => i.variant_id === variant)?.quantity || 0) + amount >
            v.stock_quantity))
    ) {
      toast.error("No quedan más unidades disponibles.");
      return;
    }
    setCart((prev) => {
      const old = prev.find(
        (i) => i.product_id === p.id && i.variant_id === variant,
      );
      if (old && old.quantity + amount > 20) return prev;
      return old
        ? prev.map((i) =>
            i === old ? { ...i, quantity: i.quantity + amount } : i,
          )
        : [
            ...prev,
            { product_id: p.id, variant_id: variant, quantity: amount },
          ];
    });
    toast.success("Agregado a tu selección");
    setCartOpen(true);
  }
  function quantity(id: string, variant: string | null, n: number) {
    setCart((prev) =>
      n <= 0
        ? prev.filter((i) => !(i.product_id === id && i.variant_id === variant))
        : prev.map((i) =>
            i.product_id === id && i.variant_id === variant
              ? { ...i, quantity: Math.min(20, n) }
              : i,
          ),
    );
  }
  return (
    <C.Provider
      value={{
        store,
        loading,
        error,
        reload,
        cart,
        add,
        quantity,
        clear: () => setCart([]),
        favorites,
        favorite: (id) =>
          setFavorites((f) =>
            f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
          ),
        discreet,
        setDiscreet: setDiscreetState,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
      }}
    >
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { background: "#f5eee8", color: "#420a25", border: "none" },
        }}
      />
    </C.Provider>
  );
}
