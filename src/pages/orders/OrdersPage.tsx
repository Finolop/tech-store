import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../../components/layout/Shell';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../presenter/i18n-context';
import { formatMoney, formatDate } from '../../presenter/format';
import { apiGet, apiPatch } from '../../model/api';

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryAddress: string;
  contactPhone: string;
  comment?: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<OrderRecord['status'], { ru: string; en: string }> = {
  PENDING: { ru: 'Ожидает оплаты', en: 'Pending' },
  PAID: { ru: 'Оплачен · В сборке', en: 'Paid · Processing' },
  SHIPPED: { ru: 'В пути', en: 'Shipped' },
  DELIVERED: { ru: 'Доставлен', en: 'Delivered' },
  CANCELLED: { ru: 'Отменён', en: 'Cancelled' },
};

export function OrdersPage() {
  const { lang } = useI18n();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    setLoading(true);
    void apiGet<{ orders?: OrderRecord[]; data?: OrderRecord[] }>('/orders').then((res) => {
      if (res.ok) {
        setOrders(res.orders || res.data || []);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    const res = await apiPatch(`/orders/${orderId}/cancel`, {});
    if (res.ok) {
      loadOrders();
    }
  };

  return (
    <Shell>
      <div className="orders-page">
        <div className="shead">
          <h1>{lang === 'ru' ? 'Мои заказы' : 'My Orders'}</h1>
          <small>
            {lang === 'ru'
              ? `Всего заказов: ${orders.length}`
              : `Total orders: ${orders.length}`}
          </small>
        </div>

        {loading ? (
          <div className="catalog-state">
            <p>{lang === 'ru' ? 'Загрузка истории заказов…' : 'Loading orders…'}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty orders-empty">
            <Icon name="bag" />
            <p>{lang === 'ru' ? 'У вас пока нет оформленных заказов' : 'You have no orders yet'}</p>
            <Link to="/" className="btn orders-empty-cta">
              {lang === 'ru' ? 'Перейти в каталог' : 'Browse catalog'}
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS.PAID;
              return (
                <article key={order.id} className="order-card">
                  <div className="order-head">
                    <div className="order-meta">
                      <span className="order-label">
                        {lang === 'ru' ? 'Заказ' : 'Order'}
                      </span>
                      <strong className="order-id">#{order.id}</strong>
                      <span className="order-date">
                        · {formatDate(order.createdAt, lang)}
                      </span>
                    </div>

                    <span className="order-status" data-status={order.status}>
                      <span className="order-status-dot" />
                      {st[lang]}
                    </span>
                  </div>

                  <div className="order-items">
                    {order.items?.map((item) => (
                      <div key={item.id} className="order-item">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productTitle}
                            className="order-item-img"
                          />
                        ) : (
                          <div className="order-item-ph">
                            <Icon name="bag" />
                          </div>
                        )}
                        <div className="order-item-info">
                          <div className="order-item-title">{item.productTitle}</div>
                          <div className="order-item-qty">
                            {item.quantity} × {formatMoney(item.price, lang)}
                          </div>
                        </div>
                        <div className="order-item-sum">
                          {formatMoney(item.price * item.quantity, lang)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-foot">
                    <div className="order-delivery">
                      {lang === 'ru' ? 'Адрес доставки:' : 'Delivery:'}{' '}
                      <strong>{order.deliveryAddress}</strong> · {order.contactPhone}
                    </div>

                    <div className="order-actions">
                      <div className="order-total">
                        {lang === 'ru' ? 'Итого:' : 'Total:'}{' '}
                        {formatMoney(order.totalAmount, lang)}
                      </div>
                      {(order.status === 'PENDING' || order.status === 'PAID') && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          className="btn btn-outline order-cancel-btn"
                        >
                          {lang === 'ru' ? 'Отменить заказ' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
