import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

export interface UserEntity {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  nickname?: string;
  avatarUrl?: string | null;
  email: string;
  phone: string;
  password: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenEntity {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
  createdAt: string;
}

export interface BannerEntity {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface ProductEntity {
  id: string;
  title: string;
  name: string;
  slug: string;
  brand: string;
  colors: [string, string];
  badge: 'hit' | 'new' | 'sale' | null;
  description: { ru: string; en: string };
  price: number;
  oldPrice: number | null;
  stock: number;
  image: string;
  images: string[];
  specs: Record<string, any>;
  isFeatured: boolean;
  categoryId: string;
  category: 'smartphones' | 'laptops' | 'peripherals' | 'accessories' | 'software';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEntity {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface QuestionEntity {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface AnswerEntity {
  id: string;
  questionId: string;
  userId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface CartItemEntity {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
}

export interface FavoriteEntity {
  id: string;
  userId: string;
  productId: string;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  productId: string;
  price: number;
  quantity: number;
}

export interface OrderEntity {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  promoCode?: string | null;
  warrantyCare?: boolean;
  warrantyPrice?: number;
  paymentMethod?: 'CARD' | 'SBP';
  recipientName?: string;
  deliveryAddress: string;
  contactPhone: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeEntity {
  id: string;
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  description: string;
  isActive: boolean;
}

export interface ChatMessageEntity {
  id: string;
  sessionId: string;
  from: 'me' | 'support';
  text: string;
  createdAt: string;
}

export interface TradeInRequestEntity {
  id: string;
  userId?: string;
  deviceCategory: string;
  brand: string;
  model: string;
  condition: 'excellent' | 'good' | 'working' | 'damaged';
  estimatedDiscount: number;
  promoCode: string;
  createdAt: string;
}

export interface B2BQuoteEntity {
  id: string;
  companyName: string;
  inn: string;
  contactEmail: string;
  contactPhone: string;
  items: Array<{ productId: string; title: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  vatAmount: number;
  status: 'GENERATED' | 'PAID';
  createdAt: string;
}

interface DatabaseSchema {
  users: UserEntity[];
  refreshTokens: RefreshTokenEntity[];
  categories: CategoryEntity[];
  banners: BannerEntity[];
  products: ProductEntity[];
  reviews: ReviewEntity[];
  questions: QuestionEntity[];
  answers: AnswerEntity[];
  cartItems: CartItemEntity[];
  favorites: FavoriteEntity[];
  orders: OrderEntity[];
  orderItems: OrderItemEntity[];
  promoCodes: PromoCodeEntity[];
  chatMessages: ChatMessageEntity[];
  tradeInRequests: TradeInRequestEntity[];
  b2bQuotes: B2BQuoteEntity[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const CHARGER_IMAGE_URL =
  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  const demoPasswordHash = bcrypt.hashSync('demo12345', 10);
  const adminPasswordHash = bcrypt.hashSync('admin12345', 10);

  const demoUser: UserEntity = {
    id: 'user-demo-1',
    firstName: 'Алексей',
    lastName: 'Морозов',
    login: 'alexey',
    nickname: 'alexey',
    avatarUrl: null,
    email: 'demo@arcshop.com',
    phone: '+79990001122',
    password: demoPasswordHash,
    role: 'CUSTOMER',
    createdAt: now,
    updatedAt: now,
  };

  const adminUser: UserEntity = {
    id: 'user-admin-1',
    firstName: 'Администратор',
    lastName: 'ARCSHOP',
    login: 'admin',
    nickname: 'admin',
    avatarUrl: null,
    email: 'admin@arcshop.com',
    phone: '+79998887766',
    password: adminPasswordHash,
    role: 'ADMIN',
    createdAt: now,
    updatedAt: now,
  };

  const categories: CategoryEntity[] = [
    { id: 'cat-smartphones', name: 'Смартфоны', slug: 'smartphones', icon: 'smartphone', order: 1, createdAt: now },
    { id: 'cat-laptops', name: 'Ноутбуки', slug: 'laptops', icon: 'laptop', order: 2, createdAt: now },
    { id: 'cat-peripherals', name: 'Периферия', slug: 'peripherals', icon: 'headphones', order: 3, createdAt: now },
    { id: 'cat-accessories', name: 'Аксессуары', slug: 'accessories', icon: 'bag', order: 4, createdAt: now },
    { id: 'cat-software', name: 'Драйверы & Софт', slug: 'software', icon: 'book', order: 5, createdAt: now },
  ];

  const banners: BannerEntity[] = [
    {
      id: 'banner-1',
      title: 'Весенняя распродажа: скидки на ультрабуки и смартфоны до 25%',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      link: '/laptops',
      isActive: true,
      order: 1,
      createdAt: now,
    },
  ];

  const products: ProductEntity[] = [
    {
      id: 'prod-arc-phone-x',
      title: 'Arc Phone X',
      name: 'Arc Phone X',
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
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80'],
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
      isFeatured: true,
      categoryId: 'cat-smartphones',
      category: 'smartphones',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-nova-s5',
      title: 'Nova S5',
      name: 'Nova S5',
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
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'],
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
      isFeatured: false,
      categoryId: 'cat-smartphones',
      category: 'smartphones',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-arc-book-15-pro',
      title: 'Arc Book 15 Pro',
      name: 'Arc Book 15 Pro',
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
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'],
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
      isFeatured: true,
      categoryId: 'cat-laptops',
      category: 'laptops',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-arc-pulse-headset',
      title: 'Arc Pulse Headset',
      name: 'Arc Pulse Headset',
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
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
      specs: {
        type: { ru: 'Игровая гарнитура', en: 'Gaming headset' },
        connection: { ru: '2.4 ГГц / Bluetooth', en: '2.4 GHz / Bluetooth' },
        latency: 20,
        battery: 40,
        weight: 290,
        rgb: true,
        warranty: 12,
      },
      isFeatured: false,
      categoryId: 'cat-peripherals',
      category: 'peripherals',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-nova-strike-mouse',
      title: 'Nova Strike Mouse',
      name: 'Nova Strike Mouse',
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
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'],
      specs: {
        type: { ru: 'Мышь', en: 'Mouse' },
        connection: { ru: '2.4 ГГц', en: '2.4 GHz' },
        latency: 1,
        battery: 90,
        weight: 58,
        rgb: true,
        warranty: 12,
      },
      isFeatured: false,
      categoryId: 'cat-peripherals',
      category: 'peripherals',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-arc-charge-65',
      title: 'Arc Charge 65W',
      name: 'Arc Charge 65W',
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
      image: CHARGER_IMAGE_URL,
      images: [CHARGER_IMAGE_URL],
      specs: {
        type: { ru: 'Зарядное устройство', en: 'Charger' },
        power: 65,
        ports: 3,
        cable: 1.5,
        weight: 140,
        warranty: 12,
      },
      isFeatured: false,
      categoryId: 'cat-accessories',
      category: 'accessories',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-arc-driver-suite',
      title: 'Arc Driver Suite Pro',
      name: 'Arc Driver Suite Pro',
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
      image: '',
      images: [],
      specs: {
        platforms: { ru: 'Windows / Linux', en: 'Windows / Linux' },
        version: { ru: '4.2 LTS', en: '4.2 LTS' },
        devices: 3,
        support: 12,
        size: 180,
      },
      isFeatured: false,
      categoryId: 'cat-software',
      category: 'software',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const initialOrderId = 'order-demo-init';
  const initialOrder: OrderEntity = {
    id: initialOrderId,
    userId: demoUser.id,
    status: 'PAID',
    totalAmount: 59990,
    paymentMethod: 'CARD',
    recipientName: 'Алексей Морозов',
    deliveryAddress: 'г. Москва, ул. Ленина, д. 10, кв. 42',
    contactPhone: '+79990001122',
    comment: 'Доставка до двери',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  };

  const initialOrderItem: OrderItemEntity = {
    id: 'order-item-demo-1',
    orderId: initialOrderId,
    productId: 'prod-arc-phone-x',
    price: 59990,
    quantity: 1,
  };

  const reviews: ReviewEntity[] = [
    {
      id: 'rev-demo-1',
      productId: 'prod-arc-phone-x',
      userId: demoUser.id,
      authorName: 'Алексей М.',
      rating: 5,
      text: 'Экран очень плавный, заряда стабильно хватает на полтора дня активного использования. Камера в темноте приятно удивила!',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  const questions: QuestionEntity[] = [
    {
      id: 'q-demo-1',
      productId: 'prod-arc-phone-x',
      userId: demoUser.id,
      authorName: 'Сергей Н.',
      text: 'Есть ли в комплекте зарядный блок питания?',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
  ];

  const answers: AnswerEntity[] = [
    {
      id: 'ans-demo-1',
      questionId: 'q-demo-1',
      userId: adminUser.id,
      authorName: 'Магазин ARCSHOP',
      text: 'Да, в комплекте идёт фирменный блок питания GaN на 67 Вт и кабель USB Type-C.',
      createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
  ];

  const promoCodes: PromoCodeEntity[] = [
    {
      id: 'promo-1',
      code: 'ARC2026',
      discountPercent: 10,
      minOrderAmount: 5000,
      description: 'Скидка 10% на всю технику ARCSHOP при заказе от 5 000 ₽',
      isActive: true,
    },
    {
      id: 'promo-2',
      code: 'WELCOME',
      discountPercent: 5,
      minOrderAmount: 1000,
      description: 'Приветственная скидка 5% на первый заказ',
      isActive: true,
    },
    {
      id: 'promo-3',
      code: 'PRODEV',
      discountPercent: 15,
      minOrderAmount: 40000,
      description: 'Скидка 15% для разработчиков на ноутбуки и флагманы',
      isActive: true,
    },
  ];

  return {
    users: [demoUser, adminUser],
    refreshTokens: [],
    categories,
    banners,
    products,
    reviews,
    questions,
    answers,
    cartItems: [],
    favorites: [],
    orders: [initialOrder],
    orderItems: [initialOrderItem],
    promoCodes,
    chatMessages: [],
    tradeInRequests: [],
    b2bQuotes: [],
  };
}

class Store {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    const initial = getInitialData();
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const products: ProductEntity[] = (parsed.products || initial.products).map((p: ProductEntity) => {
          if (p.id === 'prod-arc-charge-65' || p.image?.includes('photo-1609592426508-cc02b662363e')) {
            return {
              ...p,
              image: CHARGER_IMAGE_URL,
              images: [CHARGER_IMAGE_URL],
            };
          }
          return p;
        });
        const users: UserEntity[] = (parsed.users || initial.users).map((u: UserEntity) => ({
          ...u,
          nickname: u.nickname ?? u.login,
          avatarUrl: u.avatarUrl ?? null,
        }));
        const merged: DatabaseSchema = {
          ...initial,
          ...parsed,
          products,
          users,
          promoCodes: parsed.promoCodes?.length ? parsed.promoCodes : initial.promoCodes,
          chatMessages: parsed.chatMessages || [],
          tradeInRequests: parsed.tradeInRequests || [],
          b2bQuotes: parsed.b2bQuotes || [],
        };
        this.saveDirect(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Could not load db.json, generating seed data:', e);
    }
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to db.json:', e);
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  public get users() {
    return this.data.users;
  }
  public get refreshTokens() {
    return this.data.refreshTokens;
  }
  public get categories() {
    return this.data.categories;
  }
  public get banners() {
    return this.data.banners;
  }
  public get products() {
    return this.data.products;
  }
  public get reviews() {
    return this.data.reviews;
  }
  public get questions() {
    return this.data.questions;
  }
  public get answers() {
    return this.data.answers;
  }
  public get cartItems() {
    return this.data.cartItems;
  }
  public get favorites() {
    return this.data.favorites;
  }
  public get orders() {
    return this.data.orders;
  }
  public get orderItems() {
    return this.data.orderItems;
  }
  public get promoCodes() {
    return this.data.promoCodes;
  }
  public get chatMessages() {
    return this.data.chatMessages;
  }
  public get tradeInRequests() {
    return this.data.tradeInRequests;
  }
  public get b2bQuotes() {
    return this.data.b2bQuotes;
  }
}

export const db = new Store();
