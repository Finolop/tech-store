import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../model/api';
import { useAuth } from './auth-context';
import { useCatalog } from './catalog-context';

export interface CartEntry {
  id: string;
  qty: number;
}

interface ShopValue {
  favorites: string[];
  cart: CartEntry[];
  compareIds: string[];
  cartCount: number;
  cartTotal: number;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
  addToCart: (id: string) => void;
  changeQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleCompare: (id: string) => void;
  setCompareIds: (ids: string[]) => void;
}

const FAV_KEY = 'arcshop:favorites';
const CART_KEY = 'arcshop:cart';
const COMPARE_KEY = 'arcshop:compare';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

const ShopContext = createContext<ShopValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { byId } = useCatalog();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(() => loadJson(FAV_KEY, []));
  const [cart, setCart] = useState<CartEntry[]>(() => loadJson(CART_KEY, []));
  const [compareIds, setCompareIds] = useState<string[]>(() => loadJson(COMPARE_KEY, []));
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => saveJson(FAV_KEY, favorites), [favorites]);
  useEffect(() => saveJson(CART_KEY, cart), [cart]);
  useEffect(() => saveJson(COMPARE_KEY, compareIds), [compareIds]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void apiGet<{ data?: Array<{ productId: string }> }>('/favorites').then((res) => {
      if (cancelled || !res.ok || !Array.isArray(res.data)) return;
      if (res.data.length > 0) {
        setFavorites((prev) => Array.from(new Set([...prev, ...res.data!.map((f) => f.productId)])));
      }
    });

    void apiGet<{ data?: { items?: Array<{ productId: string; quantity: number }> } }>('/cart').then((res) => {
      if (cancelled || !res.ok || !res.data?.items) return;
      if (res.data.items.length > 0) {
        setCart((prev) => {
          const map = new Map(prev.map((e) => [e.id, e.qty]));
          for (const item of res.data!.items!) {
            if (!map.has(item.productId)) {
              map.set(item.productId, item.quantity);
            }
          }
          return Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((list) => {
        const exists = list.includes(id);
        if (user) {
          if (exists) void apiDelete(`/favorites/${id}`);
          else void apiPost(`/favorites/${id}`, {});
        }
        return exists ? list.filter((item) => item !== id) : [...list, id];
      });
    },
    [user],
  );

  const clearFavorites = useCallback(() => {
    if (user) {
      favorites.forEach((id) => void apiDelete(`/favorites/${id}`));
    }
    setFavorites([]);
  }, [user, favorites]);

  const addToCart = useCallback(
    (id: string) => {
      if (user) {
        void apiPost('/cart/items', { productId: id, quantity: 1 });
      }
      setCart((list) => {
        const found = list.find((entry) => entry.id === id);
        return found
          ? list.map((entry) => (entry.id === id ? { ...entry, qty: entry.qty + 1 } : entry))
          : [...list, { id, qty: 1 }];
      });
    },
    [user],
  );

  const changeQty = useCallback(
    (id: string, delta: number) => {
      setCart((list) => {
        const nextList = list
          .map((entry) => (entry.id === id ? { ...entry, qty: entry.qty + delta } : entry))
          .filter((entry) => entry.qty > 0);
        if (user) {
          const updated = nextList.find((e) => e.id === id);
          if (updated) {
            void apiPatch(`/cart/items/${id}`, { quantity: updated.qty });
          } else {
            void apiDelete(`/cart/items/${id}`);
          }
        }
        return nextList;
      });
    },
    [user],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      if (user) {
        void apiDelete(`/cart/items/${id}`);
      }
      setCart((list) => list.filter((entry) => entry.id !== id));
    },
    [user],
  );

  const clearCart = useCallback(() => {
    if (user) {
      void apiDelete('/cart');
    }
    setCart([]);
  }, [user]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  }, []);

  const value = useMemo<ShopValue>(() => {
    const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);
    const cartTotal = cart.reduce((sum, entry) => sum + (byId.get(entry.id)?.price ?? 0) * entry.qty, 0);
    return {
      favorites,
      cart,
      compareIds,
      cartCount,
      cartTotal,
      checkoutOpen,
      setCheckoutOpen,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
      clearFavorites,
      addToCart,
      changeQty,
      removeFromCart,
      clearCart,
      toggleCompare,
      setCompareIds,
    };
  }, [
    favorites,
    cart,
    compareIds,
    checkoutOpen,
    byId,
    toggleFavorite,
    clearFavorites,
    addToCart,
    changeQty,
    removeFromCart,
    clearCart,
    toggleCompare,
  ]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
