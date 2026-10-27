import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/** Ссылка на текущую страницу с открытым окном товара: ?product=id (ссылкой можно делиться) */
export function useProductLink(): (id: string) => string {
  const { pathname, search } = useLocation();
  return useCallback(
    (id: string) => {
      const params = new URLSearchParams(search);
      params.set('product', id);
      return `${pathname}?${params.toString()}`;
    },
    [pathname, search],
  );
}
