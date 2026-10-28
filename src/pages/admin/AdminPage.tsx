import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { useI18n } from '../../presenter/i18n-context';
import { formatMoney, formatDate } from '../../presenter/format';
import { Shell } from '../../components/layout/Shell';
import { Icon } from '../../components/ui/Icon';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../model/api';
import type { Product } from '../../model/types';

interface AdminStats {
  totalRevenue: number;
  estimatedGrossProfit: number;
  totalOrders: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  averageOrderValue: number;
  totalUsers: number;
  totalProducts: number;
  lowStockProducts: Array<{ id: string; title: string; slug: string; stock: number; price: number }>;
  categoryBreakdown: Array<{ category: string; slug: string; productCount: number; totalStock: number }>;
}

interface AdminOrder {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  recipientName?: string;
  deliveryAddress: string;
  contactPhone: string;
  promoCode?: string;
  warrantyCare?: boolean;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  items: Array<{
    id: string;
    productId: string;
    price: number;
    quantity: number;
    product?: { id: string; title: string; slug: string } | null;
  }>;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
  ordersCount: number;
}

interface AdminBanner {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  order: number;
}

const STATUS_RU_LABELS: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен (в сборке)',
  SHIPPED: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

const CATEGORY_RU_NAMES: Record<string, string> = {
  smartphones: 'Смартфоны',
  laptops: 'Ноутбуки',
  peripherals: 'Периферия',
  accessories: 'Аксессуары',
  software: 'Драйверы & Софт',
};

export function AdminPage() {
  const { user, ready } = useAuth();
  const { lang } = useI18n();
  const [tab, setTab] = useState<'stats' | 'orders' | 'products' | 'users' | 'banners'>('stats');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);

  const [loading, setLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [showAddProduct, setShowAddProduct] = useState(false);

  // New product form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('smartphones');
  const [newBrand, setNewBrand] = useState('Arc');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newImage, setNewImage] = useState('');

  const loadStats = useCallback(async () => {
    const res = await apiGet<{ stats: AdminStats }>('/admin/stats');
    if (res.ok && res.stats) setStats(res.stats);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await apiGet<{ orders: AdminOrder[] }>('/admin/orders');
    if (res.ok && res.orders) setOrders(res.orders);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await apiGet<{ products: Product[] }>('/products');
    if (res.ok && res.products) setProducts(res.products);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await apiGet<{ users: AdminUser[] }>('/admin/users');
    if (res.ok && res.users) setUsersList(res.users);
  }, []);

  const loadBanners = useCallback(async () => {
    const res = await apiGet<{ banners: AdminBanner[] }>('/admin/banners');
    if (res.ok && res.banners) setBanners(res.banners);
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setLoading(true);
      void Promise.all([loadStats(), loadOrders(), loadProducts(), loadUsers(), loadBanners()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, loadStats, loadOrders, loadProducts, loadUsers, loadBanners]);

  if (!ready) {
    return (
      <Shell>
        <div className="admin-page">
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Загрузка сессии...</p>
        </div>
      </Shell>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <Shell>
        <div className="admin-page">
          <div className="admin-access-denied">
            <div style={{ width: '56px', height: '56px', margin: '0 auto', color: 'var(--error)' }}>
              <Icon name="shield" />
            </div>
            <h2>Доступ ограничен</h2>
            <p>
              Панель управления доступна исключительно пользователям с правами Администратора (ADMIN). Пожалуйста, войдите в систему под учётной записью администратора.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/login" className="admin-action-btn btn-solid">
                Войти как Администратор
              </Link>
              <Link to="/" className="admin-action-btn btn-outlined">
                Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    const res = await apiPatch(`/admin/orders/${orderId}/status`, { status: nextStatus });
    if (res.ok) {
      void loadOrders();
      void loadStats();
      void loadProducts();
    }
  };

  const handleUpdateStock = async (productId: string, newStockVal: number) => {
    if (newStockVal < 0) return;
    const res = await apiPatch(`/admin/products/${productId}`, { stock: newStockVal });
    if (res.ok) {
      void loadProducts();
      void loadStats();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Вы действительно хотите удалить этот товар из каталога?')) return;
    const res = await apiDelete(`/admin/products/${productId}`);
    if (res.ok) {
      void loadProducts();
      void loadStats();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return;

    const res = await apiPost('/admin/products', {
      title: newTitle,
      name: newTitle,
      category: newCategory,
      brand: newBrand,
      price: Number(newPrice),
      stock: Number(newStock) || 10,
      image: newImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      description: { ru: `Фирменный девайс ${newTitle}`, en: `${newTitle} by ${newBrand}` },
    });

    if (res.ok) {
      setShowAddProduct(false);
      setNewTitle('');
      setNewPrice('');
      setNewStock('10');
      setNewImage('');
      void loadProducts();
      void loadStats();
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    const roleRuName = nextRole === 'ADMIN' ? 'Администратор' : 'Покупатель';
    if (!window.confirm(`Изменить роль пользователя на "${roleRuName}"?`)) return;
    const res = await apiPatch(`/admin/users/${userId}/role`, { role: nextRole });
    if (res.ok) {
      void loadUsers();
    }
  };

  const filteredOrders = orders.filter((o) => (orderFilter === 'ALL' ? true : o.status === orderFilter));

  const filterButtons = [
    { key: 'ALL', label: 'Все заказы' },
    { key: 'PENDING', label: 'Ожидают оплаты' },
    { key: 'PAID', label: 'Оплачены' },
    { key: 'SHIPPED', label: 'В пути' },
    { key: 'DELIVERED', label: 'Доставлены' },
    { key: 'CANCELLED', label: 'Отменены' },
  ];

  return (
    <Shell>
      <div className="admin-page">
        {/* Header matching .shead */}
        <div className="admin-shead">
          <div>
            <div className="admin-shead-title">
              <h1>Панель управления</h1>
              <span className="admin-role-badge">Администратор</span>
            </div>
            <div className="admin-shead-sub">
              Центр управления заказами, складом, пользователями и аналитикой ARCSHOP
            </div>
          </div>
          <div className="admin-shead-actions">
            <button
              className="admin-action-btn btn-outlined"
              onClick={() => {
                void loadStats();
                void loadOrders();
                void loadProducts();
              }}
              title="Обновить данные"
            >
              <Icon name="check" />
              Обновить
            </button>
            <Link to="/" className="admin-action-btn btn-solid">
              <Icon name="grid" />
              В витрину
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-nav-tabs">
          <button
            className={`admin-tab-item ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
          >
            <Icon name="star" />
            Дашборд и Метрики
          </button>
          <button
            className={`admin-tab-item ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <Icon name="truck" />
            Заказы ({orders.length})
          </button>
          <button
            className={`admin-tab-item ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            <Icon name="laptop" />
            Товары ({products.length})
          </button>
          <button
            className={`admin-tab-item ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <Icon name="user" />
            Пользователи ({usersList.length})
          </button>
          <button
            className={`admin-tab-item ${tab === 'banners' ? 'active' : ''}`}
            onClick={() => setTab('banners')}
          >
            <Icon name="grid" />
            Баннеры ({banners.length})
          </button>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Синхронизация данных с сервером...</p>}

        {/* 1. TAB: STATS */}
        {tab === 'stats' && stats && (
          <div>
            <div className="admin-kpi-grid">
              <div className="admin-kpi-card">
                <div className="admin-kpi-label">Выручка</div>
                <div className="admin-kpi-val">{formatMoney(stats.totalRevenue, lang)}</div>
                <div className="admin-kpi-sub">Оплачено заказов: {stats.paidOrdersCount}</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-label">Валовая прибыль (план 22%)</div>
                <div className="admin-kpi-val" style={{ color: 'var(--success)' }}>
                  {formatMoney(stats.estimatedGrossProfit, lang)}
                </div>
                <div className="admin-kpi-sub">Целевая маржинальность бутика</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-label">Средний чек (AOV)</div>
                <div className="admin-kpi-val">{formatMoney(stats.averageOrderValue, lang)}</div>
                <div className="admin-kpi-sub">Всего сформировано заказов: {stats.totalOrders}</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-label">Клиенты и Каталог</div>
                <div className="admin-kpi-val">{stats.totalUsers} чел.</div>
                <div className="admin-kpi-sub">{stats.totalProducts} активных товаров на витрине</div>
              </div>
            </div>

            {/* Low stock alert WITHOUT the add button */}
            {stats.lowStockProducts.length > 0 && (
              <div className="admin-alert-box">
                <div className="admin-alert-head">
                  <Icon name="shield" />
                  Товары с низким остатком на складе ({stats.lowStockProducts.length})
                </div>
                <div className="admin-alert-items">
                  {stats.lowStockProducts.map((p) => (
                    <div key={p.id} className="admin-stock-chip">
                      <span>{p.title}</span>
                      <span className="admin-stock-badge">{p.stock} шт.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category summary table */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '28px 0 14px' }}>
              Распределение товаров по категориям
            </h3>
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-table-main">
                  <thead>
                    <tr>
                      <th>Категория</th>
                      <th>Системный Slug</th>
                      <th>Количество товаров</th>
                      <th>Суммарный складской остаток</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.categoryBreakdown.map((c) => (
                      <tr key={c.slug}>
                        <td style={{ fontWeight: 600 }}>{c.category}</td>
                        <td><code>{c.slug}</code></td>
                        <td>{c.productCount} шт.</td>
                        <td><strong>{c.totalStock} шт.</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB: ORDERS */}
        {tab === 'orders' && (
          <div>
            <div className="admin-filter-pills">
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  className={`admin-filter-pill ${orderFilter === btn.key ? 'active' : ''}`}
                  onClick={() => setOrderFilter(btn.key)}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-table-main">
                  <thead>
                    <tr>
                      <th>Заказ</th>
                      <th>Дата</th>
                      <th>Получатель</th>
                      <th>Состав заказа</th>
                      <th>Сумма</th>
                      <th>Текущий статус</th>
                      <th>Сменить статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                          В данной категории нет заказов
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id}>
                          <td>
                            <strong>#{ord.id.slice(0, 10)}</strong>
                            {ord.promoCode && (
                              <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '2px' }}>
                                Промокод: <code>{ord.promoCode}</code>
                              </div>
                            )}
                            {ord.warrantyCare && (
                              <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>
                                + Защита ArcCare
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(ord.createdAt, lang)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {ord.recipientName || (ord.user ? `${ord.user.firstName} ${ord.user.lastName}` : 'Клиент')}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{ord.contactPhone}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ord.deliveryAddress}</div>
                          </td>
                          <td>
                            {ord.items.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                • {item.product?.title || 'Товар'} × <strong>{item.quantity} шт.</strong>
                              </div>
                            ))}
                          </td>
                          <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {formatMoney(ord.totalAmount, lang)}
                          </td>
                          <td>
                            <span className={`order-status-pill status-${ord.status}`}>
                              {STATUS_RU_LABELS[ord.status] || ord.status}
                            </span>
                          </td>
                          <td>
                            <select
                              className="admin-select-status"
                              value={ord.status}
                              onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                            >
                              <option value="PENDING">Ожидает оплаты</option>
                              <option value="PAID">Оплачен (в сборке)</option>
                              <option value="SHIPPED">В пути (передан в доставку)</option>
                              <option value="DELIVERED">Доставлен покупателю</option>
                              <option value="CANCELLED">Отменён (возврат на склад)</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. TAB: PRODUCTS */}
        {tab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Каталог и остатки</h3>
              <button
                className="admin-action-btn btn-solid"
                onClick={() => setShowAddProduct(!showAddProduct)}
              >
                <Icon name="plus" />
                {showAddProduct ? 'Закрыть форму' : 'Добавить товар'}
              </button>
            </div>

            {/* Add product form */}
            {showAddProduct && (
              <form className="admin-create-form" onSubmit={handleCreateProduct}>
                <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>Добавление нового устройства в каталог</h4>
                <div className="admin-form-row-grid">
                  <div className="admin-input-group">
                    <label>Название модели</label>
                    <input
                      type="text"
                      required
                      placeholder="Например, Arc Book 16 Pro"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <label>Категория</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                      <option value="smartphones">Смартфоны</option>
                      <option value="laptops">Ноутбуки</option>
                      <option value="peripherals">Периферия</option>
                      <option value="accessories">Аксессуары</option>
                      <option value="software">Драйверы & Софт</option>
                    </select>
                  </div>
                  <div className="admin-input-group">
                    <label>Бренд</label>
                    <select value={newBrand} onChange={(e) => setNewBrand(e.target.value)}>
                      <option value="Arc">Arc (Флагман)</option>
                      <option value="Nova">Nova (Партнер)</option>
                    </select>
                  </div>
                  <div className="admin-input-group">
                    <label>Цена (₽)</label>
                    <input
                      type="number"
                      required
                      placeholder="79990"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <label>Остаток на складе</label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                    />
                  </div>
                  <div className="admin-input-group">
                    <label>URL фотографии товара</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="admin-action-btn btn-solid">
                    Сохранить товар
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn btn-outlined"
                    onClick={() => setShowAddProduct(false)}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-table-main">
                  <thead>
                    <tr>
                      <th>Фото</th>
                      <th>Наименование</th>
                      <th>Категория</th>
                      <th>Бренд</th>
                      <th>Цена</th>
                      <th>Остаток на складе</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td style={{ width: '56px' }}>
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.title}
                              style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', background: 'var(--surface)' }}
                            />
                          ) : (
                            <div style={{ width: '48px', height: '48px', background: 'var(--surface)', borderRadius: '10px' }} />
                          )}
                        </td>
                        <td>
                          <strong>{p.title}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><code>{p.slug}</code></div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{CATEGORY_RU_NAMES[p.category] || p.category}</span>
                        </td>
                        <td>{p.brand}</td>
                        <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatMoney(p.price, lang)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="admin-action-btn btn-outlined"
                              style={{ padding: '2px 8px', minWidth: '28px' }}
                              onClick={() => handleUpdateStock(p.id, (p.stock ?? 0) - 1)}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: 800, minWidth: '32px', textAlign: 'center', color: (p.stock ?? 0) <= 5 ? 'var(--sale)' : 'inherit' }}>
                              {p.stock ?? 0}
                            </span>
                            <button
                              className="admin-action-btn btn-outlined"
                              style={{ padding: '2px 8px', minWidth: '28px' }}
                              onClick={() => handleUpdateStock(p.id, (p.stock ?? 0) + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            className="admin-action-btn btn-delete"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            <Icon name="trash" />
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB: USERS */}
        {tab === 'users' && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Список зарегистрированных пользователей</h3>
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-table-main">
                  <thead>
                    <tr>
                      <th>Пользователь</th>
                      <th>Email</th>
                      <th>Телефон</th>
                      <th>Заказов</th>
                      <th>Роль в системе</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.firstName} {u.lastName}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{u.login}</div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td><strong>{u.ordersCount}</strong></td>
                        <td>
                          <span
                            className="admin-role-badge"
                            style={{
                              background: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--surface)',
                              color: u.role === 'ADMIN' ? '#ffffff' : 'var(--text)',
                            }}
                          >
                            {u.role === 'ADMIN' ? 'Администратор' : 'Покупатель'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="admin-action-btn btn-outlined"
                            onClick={() => handleToggleUserRole(u.id, u.role)}
                          >
                            {u.role === 'ADMIN' ? 'Сделать покупателем' : 'Назначить администратором'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. TAB: BANNERS */}
        {tab === 'banners' && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Рекламные промо-баннеры на витрине</h3>
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-table-main">
                  <thead>
                    <tr>
                      <th>Название промо</th>
                      <th>Ссылка перехода</th>
                      <th>Порядок отображения</th>
                      <th>Статус кампании</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.title}</td>
                        <td><code>{b.link}</code></td>
                        <td>{b.order}</td>
                        <td>
                          <span className={`order-status-pill ${b.isActive ? 'status-PAID' : 'status-CANCELLED'}`}>
                            {b.isActive ? 'Активен' : 'Отключён'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default AdminPage;
