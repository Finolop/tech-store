import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiGet } from '../model/api';
import type { Product } from '../model/types';

export interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
}

interface CatalogValue {
  products: Product[];
  banners: BannerItem[];
  byId: Map<string, Product>;
  status: 'loading' | 'ready' | 'error';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;
}

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [status, setStatus] = useState<CatalogValue['status']>('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void apiGet<{ products?: Product[]; data?: Product[] }>('/products').then((result) => {
      if (cancelled) return;
      if (result.ok) {
        const list = result.products || result.data || [];
        setProducts(list);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    });

    void apiGet<{ banners?: BannerItem[]; data?: BannerItem[] }>('/banners').then((res) => {
      if (cancelled || !res.ok) return;
      setBanners(res.banners || res.data || []);
    });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  const value = useMemo<CatalogValue>(
    () => ({
      products,
      banners,
      byId: new Map(products.map((p) => [p.id, p])),
      status,
      searchQuery,
      setSearchQuery,
      refresh,
    }),
    [products, banners, status, searchQuery, refresh],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
