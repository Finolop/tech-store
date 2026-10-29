import type { Product, Review } from './types';
import type { User } from './auth';
import type { BannerItem } from '../presenter/catalog-context';
import type { ApiResult } from './api';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
  ? (import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`)
  : '/tech-store/';

export const getImg = (name: string) => `${BASE}images/${name}`;

const CHARGER_IMG = getImg('arc-charge-65.svg');

export interface MockOrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  quantity: number;
}

export interface MockOrder {
  id: string;
  userId?: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  promoCode?: string;
  warrantyPrice?: number;
  paymentMethod?: string;
  deliveryAddress: string;
  contactPhone?: string;
  recipientName?: string;
  comment?: string;
  createdAt: string;
  items: MockOrderItem[];
}

export const SEED_CATEGORIES = [
  { id: 'cat-smartphones', name: 'Смартфоны', slug: 'smartphones', icon: 'smartphone', order: 1 },
  { id: 'cat-laptops', name: 'Ноутбуки', slug: 'laptops', icon: 'laptop', order: 2 },
  { id: 'cat-peripherals', name: 'Периферия', slug: 'peripherals', icon: 'headphones', order: 3 },
  { id: 'cat-accessories', name: 'Аксессуары', slug: 'accessories', icon: 'bag', order: 4 },
  { id: 'cat-software', name: 'Драйверы & Софт', slug: 'software', icon: 'book', order: 5 },
];

export const SEED_BANNERS: BannerItem[] = [
  {
    id: 'banner-1',
    title: 'Весенняя распродажа: скидки на ультрабуки и смартфоны до 25%',
    imageUrl: getImg('banner-sale.svg'),
    link: '/laptops',
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-arc-phone-x',
    name: 'Arc Phone X',
    title: 'Arc Phone X',
    slug: 'arc-phone-x',
    brand: 'Arc',
    badge: 'hit',
    colors: ['#6c63ff', '#2ec4ff'],
    description: {
      ru: 'Флагман с ярким 120 Гц AMOLED-экраном, мощной камерой 50 Мп с оптической стабилизацией и быстрой зарядкой 67 Вт на весь день.',
      en: 'Flagship with vivid 120Hz AMOLED display, powerful 50MP OIS camera, and 67W fast charging for all-day battery life.',
    },
    price: 59990,
    oldPrice: 69990,
    stock: 14,
    rating: 5,
    reviewCount: 1,
    questionCount: 0,
    image: getImg('arc-phone-x.svg'),
    images: [getImg('arc-phone-x.svg')],
    specs: {
      chip: { ru: 'Arc A17 Bionic', en: 'Arc A17 Bionic' },
      screen: 6.7,
      refresh: 120,
      ram: 12,
      storage: 256,
      camera: 50,
      battery: 5000,
      charging: 67,
      weight: 192,
      nfc: true,
      warranty: 12,
    },
    category: 'smartphones',
  },
  {
    id: 'prod-nova-s5',
    name: 'Nova S5',
    title: 'Nova S5',
    slug: 'nova-s5',
    brand: 'Nova',
    badge: 'new',
    colors: ['#ff6b9a', '#ffb86b'],
    description: {
      ru: 'Тонкий смартфон с рекордной быстрой зарядкой 80 Вт, 64 Мп камерой и ёмким аккумулятором на 5200 мА·ч.',
      en: 'Slim smartphone with ultra-fast 80W charging, 64MP sensor and a large 5200 mAh battery.',
    },
    price: 44990,
    oldPrice: null,
    stock: 8,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: getImg('nova-s5.svg'),
    images: [getImg('nova-s5.svg')],
    specs: {
      chip: { ru: 'Nova N8 Pro', en: 'Nova N8 Pro' },
      screen: 6.5,
      refresh: 120,
      ram: 8,
      storage: 128,
      camera: 64,
      battery: 5200,
      charging: 80,
      weight: 201,
      nfc: true,
      warranty: 12,
    },
    category: 'smartphones',
  },
  {
    id: 'prod-arc-book-15-pro',
    name: 'Arc Book 15 Pro',
    title: 'Arc Book 15 Pro',
    slug: 'arc-book-15-pro',
    brand: 'Arc',
    badge: 'hit',
    colors: ['#6c63ff', '#a78bfa'],
    description: {
      ru: 'Мощный и бесшумный ультрабук для работы и творчества с 15.6" Retina экраном 120 Гц и автономностью до 16 часов.',
      en: 'Powerful, silent ultrabook for creative work with 15.6" 120Hz Retina screen and up to 16h battery life.',
    },
    price: 89990,
    oldPrice: null,
    stock: 6,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: getImg('arc-book-15-pro.svg'),
    images: [getImg('arc-book-15-pro.svg')],
    specs: {
      cpu: { ru: 'Arc M2 Pro', en: 'Arc M2 Pro' },
      cores: 10,
      gpu: { ru: 'Встроенная 16 ядер', en: 'Integrated 16-core' },
      ram: 16,
      storage: 512,
      screen: 15.6,
      refresh: 120,
      battery: 16,
      weight: 1.7,
      warranty: 12,
    },
    category: 'laptops',
  },
  {
    id: 'prod-arc-pulse-headset',
    name: 'Arc Pulse Headset',
    title: 'Arc Pulse Headset',
    slug: 'arc-pulse-headset',
    brand: 'Arc',
    badge: 'hit',
    colors: ['#6c63ff', '#22d3ee'],
    description: {
      ru: 'Беспроводная игровая гарнитура: 40 часов звука высокой четкости, RGB-подсветка и ультранизкая задержка 20 мс.',
      en: 'Wireless gaming headset: 40 hours of hi-fi audio, RGB lighting, and ultra-low 20ms latency.',
    },
    price: 7990,
    oldPrice: null,
    stock: 20,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: getImg('arc-pulse-headset.svg'),
    images: [getImg('arc-pulse-headset.svg')],
    specs: {
      type: { ru: 'Игровая гарнитура', en: 'Gaming headset' },
      connection: { ru: '2.4 ГГц / Bluetooth', en: '2.4 GHz / Bluetooth' },
      latency: 20,
      battery: 40,
      weight: 290,
      rgb: true,
      warranty: 12,
    },
    category: 'peripherals',
  },
  {
    id: 'prod-nova-strike-mouse',
    name: 'Nova Strike Mouse',
    title: 'Nova Strike Mouse',
    slug: 'nova-strike-mouse',
    brand: 'Nova',
    badge: 'new',
    colors: ['#ff6b9a', '#8b5cf6'],
    description: {
      ru: 'Сверхлёгкая беспроводная мышь весом 58 граммов с оптическим сенсором 26000 DPI и откликом 1 мс.',
      en: 'Ultra-light 58g wireless mouse with 26,000 DPI optical sensor and 1ms response time.',
    },
    price: 5490,
    oldPrice: null,
    stock: 15,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: getImg('nova-strike-mouse.svg'),
    images: [getImg('nova-strike-mouse.svg')],
    specs: {
      type: { ru: 'Мышь', en: 'Mouse' },
      connection: { ru: '2.4 ГГц', en: '2.4 GHz' },
      latency: 1,
      battery: 90,
      weight: 58,
      rgb: true,
      warranty: 12,
    },
    category: 'peripherals',
  },
  {
    id: 'prod-arc-charge-65',
    name: 'Arc Charge 65W',
    title: 'Arc Charge 65W',
    slug: 'arc-charge-65w',
    brand: 'Arc',
    badge: 'hit',
    colors: ['#6c63ff', '#facc15'],
    description: {
      ru: 'Компактное GaN зарядное устройство мощностью 65 Вт с 3 портами для одновременного питания ноутбука, телефона и наушников.',
      en: 'Compact 65W GaN charger with 3 ports for simultaneous charging of laptop, phone, and accessories.',
    },
    price: 2490,
    oldPrice: null,
    stock: 25,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: CHARGER_IMG,
    images: [CHARGER_IMG],
    specs: {
      type: { ru: 'Зарядное устройство', en: 'Charger' },
      power: 65,
      ports: 3,
      cable: 1.5,
      weight: 140,
      warranty: 12,
    },
    category: 'accessories',
  },
  {
    id: 'prod-arc-driver-suite',
    name: 'Arc Driver Suite Pro',
    title: 'Arc Driver Suite Pro',
    slug: 'arc-driver-suite-pro',
    brand: 'Arc',
    badge: 'hit',
    colors: ['#6c63ff', '#06b6d4'],
    description: {
      ru: 'Фирменный пакет утилит: автоматическое обновление драйверов, тонкая настройка производительности и откат системы в один клик.',
      en: 'Arc software suite: automatic driver updates, hardware performance tuning, and 1-click restore.',
    },
    price: 1290,
    oldPrice: null,
    stock: 999,
    rating: 0,
    reviewCount: 0,
    questionCount: 0,
    image: getImg('arc-driver-suite.svg'),
    images: [getImg('arc-driver-suite.svg')],
    specs: {
      platforms: { ru: 'Windows / Linux', en: 'Windows / Linux' },
      version: { ru: '4.2 LTS', en: '4.2 LTS' },
      devices: 3,
      support: 12,
      size: 180,
      warranty: 12,
    },
    category: 'software',
  },
];

const DEMO_CUSTOMER: User = {
  id: 'usr-customer-1',
  login: 'alexey',
  firstName: 'Алексей',
  lastName: 'Морозов',
  nickname: 'alexey',
  email: 'demo@arcshop.com',
  phone: '+79990001122',
  role: 'CUSTOMER',
};

const DEMO_ADMIN: User = {
  id: 'usr-admin-1',
  login: 'admin',
  firstName: 'Администратор',
  lastName: 'Системы',
  nickname: 'admin',
  email: 'admin@arcshop.com',
  phone: '+79990009900',
  role: 'ADMIN',
};

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(`arcshop:ghp:v3:${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`arcshop:ghp:v3:${key}`, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

const INITIAL_DEMO_ORDER: MockOrder = {
  id: 'order-demo-1',
  userId: DEMO_CUSTOMER.id,
  status: 'DELIVERED',
  items: [
    {
      id: 'item-1',
      productId: 'prod-arc-phone-x',
      productTitle: 'Arc Phone X',
      productImage: SEED_PRODUCTS[0].image || '',
      price: 59990,
      quantity: 1,
    },
  ],
  totalAmount: 59990,
  subtotalAmount: 59990,
  discountAmount: 0,
  paymentMethod: 'card',
  deliveryAddress: 'г. Мирный, ул. Ленина, д. 1, кв. 5',
  contactPhone: '+79990001122',
  recipientName: 'Алексей Морозов',
  createdAt: '2026-10-25T10:00:00.000Z',
};

export function handleMockRequest<T>(rawPath: string, method: string, body?: any): ApiResult<T> {
  const p = rawPath.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
  const cleanPath = p.split('?')[0];

  let user = getStorage<User | null>('user', DEMO_CUSTOMER);

  // Products
  if (cleanPath === '/products' && method === 'GET') {
    return { ok: true, products: SEED_PRODUCTS, data: SEED_PRODUCTS } as any;
  }
  if (cleanPath.startsWith('/products/') && method === 'GET') {
    const id = cleanPath.replace('/products/', '');
    const product = SEED_PRODUCTS.find((pr) => pr.id === id || pr.slug === id);
    return product ? ({ ok: true, product, data: product } as any) : ({ ok: false, error: 'err.notFound' } as any);
  }

  // Categories
  if (cleanPath === '/categories' && method === 'GET') {
    return { ok: true, categories: SEED_CATEGORIES, data: SEED_CATEGORIES } as any;
  }

  // Banners
  if (cleanPath === '/banners' && method === 'GET') {
    return { ok: true, banners: SEED_BANNERS, data: SEED_BANNERS } as any;
  }

  // Auth: me
  if (cleanPath === '/auth/me' && method === 'GET') {
    return user ? ({ ok: true, user, data: user } as any) : ({ ok: false, error: 'err.unauthorized' } as any);
  }

  // Auth: login
  if (cleanPath === '/auth/login' && method === 'POST') {
    const login = (body?.login || '').toLowerCase().trim();
    if (login === 'admin') {
      user = DEMO_ADMIN;
    } else {
      user = DEMO_CUSTOMER;
    }
    setStorage('user', user);
    return { ok: true, user, data: user, accessToken: 'mock-ghp-token' } as any;
  }

  // Auth: logout
  if (cleanPath === '/auth/logout' && method === 'POST') {
    setStorage('user', null);
    return { ok: true } as any;
  }

  // Cart
  if (cleanPath === '/cart' && method === 'GET') {
    const items = getStorage<any[]>('cart', []);
    return { ok: true, items, data: items } as any;
  }
  if (cleanPath === '/cart/items' && method === 'POST') {
    const cart = getStorage<any[]>('cart', []);
    const { productId, quantity = 1 } = body || {};
    const existing = cart.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      const prod = SEED_PRODUCTS.find((x) => x.id === productId);
      cart.push({ id: `cart-${Date.now()}`, productId, quantity, product: prod });
    }
    setStorage('cart', cart);
    return { ok: true, items: cart, data: cart } as any;
  }
  if (cleanPath.startsWith('/cart/items') && method === 'DELETE') {
    const parts = cleanPath.split('/');
    const targetId = parts[parts.length - 1];
    let cart = getStorage<any[]>('cart', []);
    if (targetId && targetId !== 'items') {
      cart = cart.filter((i) => i.id !== targetId && i.productId !== targetId);
    } else {
      cart = [];
    }
    setStorage('cart', cart);
    return { ok: true, items: cart, data: cart } as any;
  }

  // Favorites
  if (cleanPath === '/favorites' && method === 'GET') {
    const favs = getStorage<string[]>('favorites', ['prod-arc-phone-x']);
    return { ok: true, favorites: favs, data: favs } as any;
  }
  if (cleanPath === '/favorites' && method === 'POST') {
    const { productId } = body || {};
    let favs = getStorage<string[]>('favorites', ['prod-arc-phone-x']);
    if (productId && !favs.includes(productId)) favs.push(productId);
    setStorage('favorites', favs);
    return { ok: true, favorites: favs, data: favs } as any;
  }
  if (cleanPath.startsWith('/favorites/') && method === 'DELETE') {
    const id = cleanPath.replace('/favorites/', '');
    let favs = getStorage<string[]>('favorites', ['prod-arc-phone-x']);
    favs = favs.filter((f) => f !== id);
    setStorage('favorites', favs);
    return { ok: true, favorites: favs, data: favs } as any;
  }

  // Orders
  if (cleanPath === '/orders' && method === 'GET') {
    const orders = getStorage<MockOrder[]>('orders', [INITIAL_DEMO_ORDER]);
    return { ok: true, orders, data: orders } as any;
  }
  if (cleanPath === '/orders' && method === 'POST') {
    const orders = getStorage<MockOrder[]>('orders', [INITIAL_DEMO_ORDER]);
    const cart = getStorage<any[]>('cart', []);
    const items: MockOrderItem[] = body?.items || cart.map((c) => ({
      id: c.id,
      productId: c.productId,
      productTitle: c.product?.name || 'Товар',
      price: c.product?.price || 0,
      quantity: c.quantity,
      productImage: c.product?.image || '',
    }));
    const newOrder: MockOrder = {
      id: `ord-${Date.now().toString(36).toUpperCase()}`,
      userId: user?.id || 'usr-guest',
      status: 'PAID',
      items,
      totalAmount: body?.totalAmount || 59990,
      subtotalAmount: body?.subtotalAmount || 59990,
      discountAmount: body?.discountAmount || 0,
      promoCode: body?.promoCode,
      warrantyPrice: body?.warrantyPrice || 0,
      paymentMethod: body?.paymentMethod || 'card',
      deliveryAddress: body?.deliveryAddress || 'г. Мирный',
      contactPhone: body?.contactPhone || '+79990001122',
      recipientName: body?.recipientName || 'Алексей Морозов',
      createdAt: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    setStorage('orders', orders);
    setStorage('cart', []);
    return { ok: true, order: newOrder, data: newOrder } as any;
  }

  // Reviews
  if (cleanPath === '/reviews' && method === 'GET') {
    const reviews: Review[] = [
      {
        id: 'rev-1',
        authorName: 'Алексей М.',
        rating: 5,
        text: 'Экран 120 Гц просто летает, заряд держит 1.5 дня. Очень доволен покупкой техники Arc!',
        createdAt: '2026-10-26T12:00:00.000Z',
        isMine: false,
      },
    ];
    return { ok: true, reviews, data: reviews } as any;
  }
  if (cleanPath === '/reviews' && method === 'POST') {
    return { ok: true, message: 'Отзыв опубликован' } as any;
  }

  // Admin Dashboard
  if (cleanPath === '/admin/dashboard' && method === 'GET') {
    const orders = getStorage<MockOrder[]>('orders', [INITIAL_DEMO_ORDER]);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0);
    const paidOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const aov = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0;
    const profit = Math.round(totalRevenue * 0.22);
    return {
      ok: true,
      data: {
        stats: {
          totalRevenue,
          projectedProfit: profit,
          aov,
          ordersCount: orders.length,
          usersCount: 18,
          productsCount: SEED_PRODUCTS.length,
        },
        orders,
      },
    } as any;
  }

  // Admin Orders
  if (cleanPath === '/admin/orders' && method === 'GET') {
    const orders = getStorage<MockOrder[]>('orders', [INITIAL_DEMO_ORDER]);
    return { ok: true, orders, data: orders } as any;
  }
  if (cleanPath.startsWith('/admin/orders/') && method === 'PATCH') {
    const id = cleanPath.split('/')[3];
    const { status } = body || {};
    const orders = getStorage<MockOrder[]>('orders', [INITIAL_DEMO_ORDER]);
    const ord = orders.find((o) => o.id === id);
    if (ord && status) {
      ord.status = status;
      setStorage('orders', orders);
    }
    return { ok: true, order: ord, data: ord } as any;
  }

  // Admin Users
  if (cleanPath === '/admin/users' && method === 'GET') {
    return { ok: true, users: [DEMO_CUSTOMER, DEMO_ADMIN], data: [DEMO_CUSTOMER, DEMO_ADMIN] } as any;
  }

  return { ok: true, data: {} } as any;
}
