import type { Category, L10n, SpecValue } from './specs';

export type Badge = 'hit' | 'new' | 'sale';

/** Товар, как его отдаёт API (вместе с агрегатами по отзывам и вопросам) */
export interface Product {
  id: string;
  category: Category;
  brand: string;
  name: string;
  title?: string;
  slug?: string;
  price: number;
  oldPrice?: number | null;
  badge?: Badge;
  /** два цвета «обложки» товара */
  colors: [string, string];
  /** Адрес фото товара. Если не задан — показывается заглушка по категории */
  image?: string;
  images?: string[];
  description: L10n;
  specs: Record<string, SpecValue>;
  rating: number;
  reviewCount: number;
  questionCount: number;
  stock?: number;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  isMine: boolean;
}

export interface ReviewSummary {
  rating: number;
  count: number;
  /** distribution[0] — число оценок «1», distribution[4] — «5» */
  distribution: number[];
}

/** Почему пользователь не может оставить отзыв (null — может) */
export type ReviewBlock = 'login' | 'purchase' | 'reviewed' | null;

export interface Answer {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  isBuyer: boolean;
  /** ответ от имени магазина */
  isShop: boolean;
}

export interface Question {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  answers: Answer[];
}

export interface OrderSummary {
  id: string;
  total: number;
  createdAt: string;
}
