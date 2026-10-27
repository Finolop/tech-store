# Полная спецификация REST API — ARCSHOP

Документация и справочник архитектуры серверного API полнофункционального интернет-магазина техники и электроники **ARCSHOP**.

---

## 1. Общие сведения и архитектура API

* **Базовый URL (Production & Dev):** `http://localhost:3000/api/v1`
* **Совместимые алиасы:** `http://localhost:3000/api/*` (все запросы к `/api/...` бесшовно транслируются в `/api/v1/...`)
* **Формат данных:** `application/json; charset=utf-8`
* **Health Check эндпоинт:** `GET http://localhost:3000/health`
* **Машиночитаемый интерактивный реестр эндпоинтов:** `GET http://localhost:3000/api/v1/endpoints`

### 1.1. Система двойной авторизации (Dual-Auth)
Платформа поддерживает гибкую гибридную авторизацию, подходящую как для SPA в браузере, так и для мобильных или внешних клиентов:
1. **Bearer токен в заголовке:**
   ```http
   Authorization: Bearer <accessToken>
   ```
2. **Безопасные HTTP-Only Cookies:**
   * `accessToken` — срок жизни 1 день (`SameSite=Lax`, `HttpOnly`)
   * `refreshToken` — срок жизни 30 дней (`SameSite=Lax`, `HttpOnly`)
   Присутствие любого из способов гарантирует успешную авторизацию запроса.

### 1.2. Стандартный формат ответов

#### Успешный ответ (HTTP 200 / 201)
```json
{
  "success": true,
  "ok": true,
  "data": { ... },
  "message": "Операция выполнена успешно"
}
```

#### Ответ с ошибкой (HTTP 400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "ok": false,
  "error": "err.invalidCredentials",
  "message": "Неверный логин или пароль"
}
```

### 1.3. Предустановленные тестовые аккаунты

| Роль | Логин / Никнейм | Email | Пароль | Права и сценарии |
| :--- | :--- | :--- | :--- | :--- |
| **Покупатель (`CUSTOMER`)** | `alexey` | `demo@arcshop.com` | `demo12345` | Оформленный заказ на смартфон Arc Phone X, проверенные отзывы, корзина, избранное |
| **Администратор (`ADMIN`)** | `admin` | `admin@arcshop.com` | `admin12345` | Полный доступ к модулю `/api/v1/admin/*`, статистика, управление складом, заказами, баннерами |

---

## 2. Модуль авторизации и профиля (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Регистрация нового покупателя. Создает учетную запись с ролью `CUSTOMER`, выдает access/refresh токены и выставляет сессионные cookies.

* **Доступ:** Публичный
* **Тело запроса:**
```json
{
  "firstName": "Иван",
  "lastName": "Петров",
  "email": "ivan@example.com",
  "phone": "+7 (999) 111-22-33",
  "login": "ivan_dev",
  "nickname": "IvanPro",
  "password": "Password123",
  "password2": "Password123"
}
```
* **Ответ (201 Created):**
```json
{
  "success": true,
  "ok": true,
  "user": {
    "id": "u-b2a1...",
    "firstName": "Иван",
    "lastName": "Петров",
    "login": "ivan_dev",
    "nickname": "IvanPro",
    "avatarUrl": null,
    "email": "ivan@example.com",
    "phone": "+7 (999) 111-22-33",
    "role": "CUSTOMER",
    "createdAt": "2026-10-28T01:00:00.000Z"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

---

### `POST /api/v1/auth/login`
Аутентификация по Email, логину или номеру телефона.

* **Доступ:** Публичный
* **Тело запроса:**
```json
{
  "identifier": "demo@arcshop.com",
  "password": "demo12345",
  "remember": true
}
```
* **Ответ (200 OK):**
```json
{
  "success": true,
  "ok": true,
  "user": {
    "id": "user-demo-1",
    "firstName": "Алексей",
    "lastName": "Морозов",
    "login": "alexey",
    "nickname": "alexey",
    "avatarUrl": null,
    "email": "demo@arcshop.com",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

---

### `GET /api/v1/auth/me`
Получение профиля текущего пользователя по JWT-токену или кукам.

* **Доступ:** Авторизованный (Bearer / Cookie)
* **Ответ (200 OK):**
```json
{
  "success": true,
  "ok": true,
  "user": {
    "id": "user-demo-1",
    "firstName": "Алексей",
    "lastName": "Морозов",
    "login": "alexey",
    "nickname": "alexey",
    "avatarUrl": null,
    "email": "demo@arcshop.com",
    "phone": "+79990001122",
    "role": "CUSTOMER"
  }
}
```

---

### `PATCH /api/v1/auth/me`
Частичное обновление профиля пользователя.

* **Доступ:** Авторизованный
* **Тело запроса:**
```json
{
  "firstName": "Алексей",
  "lastName": "Смирнов",
  "phone": "+7 (999) 555-44-33"
}
```

---

### `PATCH /api/v1/auth/avatar`
Быстрая смена ссылки на аватар и отображаемого никнейма.

* **Доступ:** Авторизованный
* **Тело запроса:**
```json
{
  "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
  "nickname": "alexey_super"
}
```

---

### `PATCH /api/v1/auth/nickname`
Смена публичного никнейма с валидацией уникальности (от 2 до 30 символов).

* **Доступ:** Авторизованный
* **Тело запроса:**
```json
{
  "nickname": "alexey_tech"
}
```

---

### `POST /api/v1/auth/change-password`
Смена пароля с мгновенной инвалидацией всех выданных ранее refresh-токенов.

* **Доступ:** Авторизованный
* **Тело запроса:**
```json
{
  "currentPassword": "demo12345",
  "newPassword": "newSecretPassword123"
}
```

---

### `POST /api/v1/auth/refresh`
Обновление пары токенов по действующему refresh-токену.

* **Доступ:** Публичный (токен передается в теле `{ "refreshToken": "..." }` или cookie `refreshToken`)

---

### `POST /api/v1/auth/logout` и `POST /api/v1/auth/logout-all`
* `/logout` — отзыв текущего refresh-токена и очистка cookie.
* `/logout-all` — инвалидация всех сессий пользователя на всех устройствах.

---

## 3. Каталог товаров и категорий (`/api/v1/products`, `/api/v1/categories`, `/api/v1/banners`)

### `GET /api/v1/categories`
Список категорий с подсчетом доступных товаров в каждой (`productCount`).

* **Ответ (200 OK):**
```json
{
  "success": true,
  "ok": true,
  "data": [
    { "id": "cat-smartphones", "name": "Смартфоны", "slug": "smartphones", "icon": "smartphone", "order": 1, "productCount": 2 },
    { "id": "cat-laptops", "name": "Ноутбуки", "slug": "laptops", "icon": "laptop", "order": 2, "productCount": 2 },
    { "id": "cat-peripherals", "name": "Периферия", "slug": "peripherals", "icon": "headphones", "order": 3, "productCount": 2 },
    { "id": "cat-accessories", "name": "Аксессуары", "slug": "accessories", "icon": "bag", "order": 4, "productCount": 1 },
    { "id": "cat-software", "name": "Драйверы & Софт", "slug": "software", "icon": "book", "order": 5, "productCount": 1 }
  ]
}
```

---

### `GET /api/v1/banners`
Активные промо-баннеры для карусели на главной странице.

---

### `GET /api/v1/products`
Каталог товаров с комплексной фильтрацией, сортировкой и пагинацией.

* **Query параметры:**
  * `category` — slug категории (`smartphones`, `laptops`, `peripherals`, `accessories`, `software`)
  * `brand` — фильтр по бренду (`Arc`, `Nova`)
  * `badge` — фильтр по плашке (`hit`, `new`, `sale`)
  * `minPrice`, `maxPrice` — диапазон цен
  * `inStock=true` — только товары в наличии
  * `isFeatured=true` — только рекомендуемые товары
  * `search` — полнотекстовый поиск по названию, бренду, описанию (RU/EN)
  * `sort` — `price_asc`, `price_desc`, `popular`, `newest` (по умолчанию)
  * `page`, `limit` — постраничная навигация (по умолчанию page=1, limit=24)

* **Пример вызова:** `GET /api/v1/products?category=smartphones&sort=popular`

---

### `GET /api/v1/products/:slug`
Детальная карточка товара по `slug` (например, `arc-phone-x`) или `id`. Возвращает расширенный объект со средним рейтингом `rating`, количеством отзывов `reviewCount` и вопросов `questionCount`.

---

## 4. Умное сравнение товаров (`/api/v1/products/compare`)

### `GET /api/v1/products/compare?ids=prod-1,prod-2`
### `POST /api/v1/products/compare`
Алгоритм взвешенного матричного сравнения девайсов одной категории.
* Вычисляет нормализованный итоговый балл (0–100%) по весам характеристик (процессор, экран, батарея, вес, память, задержка).
* Определяет победителей в номинациях:
  * `bestOverall` — абсолютный лидер по характеристикам
  * `bestValue` — лучшее соотношение цены и возможностей (Score / Price)
  * `cheapest` / `priciest` — самый доступный и самый дорогой
  * `rows` — детальные строки характеристик с флагами `best`, `worst`, `differs`

* **Тело запроса (для POST):**
```json
{
  "ids": ["prod-arc-phone-x", "prod-nova-s5"]
}
```

---

## 5. Проверенные отзывы с верификацией покупки (`/api/v1/products/:productId/reviews`)

Ключевое преимущество ARCSHOP — **Trust by Design**: отзыв к товару может оставить только покупатель, оформивший и оплативший заказ с этим товаром.

### `GET /api/v1/products/:productId/reviews`
Возвращает список отзывов, гистограмму распределения оценок 1–5 звезд и статус доступа текущего пользователя к форме отзыва (`login`, `purchase`, `reviewed`, `null`).

### `POST /api/v1/products/:productId/reviews`
Публикация отзыва.
* **Доступ:** Авторизованный покупатель с подтвержденной покупкой товара
* **Тело запроса:**
```json
{
  "rating": 5,
  "text": "Пользуюсь уже месяц — скорость отклика и дисплей превзошли все ожидания!"
}
```

### `PATCH /api/v1/products/:productId/reviews/:reviewId` (или `/api/v1/reviews/:reviewId`)
Редактирование своего отзыва (или любым администратором).

### `DELETE /api/v1/products/:productId/reviews/:reviewId` (или `/api/v1/reviews/:reviewId`)
Удаление отзыва автором или администратором.

---

## 6. Вопросы и ответы Q&A (`/api/v1/products/:productId/questions`)

### `GET /api/v1/products/:productId/questions`
Список вопросов с древовидными ответами. Автоматически размечает бейджи:
* `isBuyer: true` — автор вопроса приобрел данный девайс.
* `isShop: true` — официальный ответ службы поддержки ARCSHOP.

### `POST /api/v1/products/:productId/questions`
Задать вопрос по товару.

### `POST /api/v1/questions/:questionId/answers`
Ответить на вопрос. Ответы от администратора автоматически получают имя «Магазин ARCSHOP» и статус `isShop: true`.

---

## 7. Серверная корзина (`/api/v1/cart`)

Синхронизируется с LocalStorage и сохраняется в базе данных для авторизованных пользователей:
* `GET /api/v1/cart` — получение позиций корзины с расчетом промежуточного итога `subtotal`, общего количества `totalCount` и итоговой стоимости `totalPrice`.
* `POST /api/v1/cart` (или `POST /api/v1/cart/items`) — добавить товар `{ "productId": "...", "quantity": 1 }` с автоматической проверкой складских остатков.
* `POST /api/v1/cart/sync` — пакетная синхронизация корзины неавторизованного гостя при входе в аккаунт.
* `PATCH /api/v1/cart/:itemId` (или `PATCH /api/v1/cart/items/:itemId`) — изменить количество позиции.
* `DELETE /api/v1/cart/:itemId` (или `DELETE /api/v1/cart/items/:itemId`) — удалить товар из корзины.
* `DELETE /api/v1/cart` — очистить всю корзину.

---

## 8. Избранное (`/api/v1/favorites`)

* `GET /api/v1/favorites` — список избранных товаров с наполненными данными карточек.
* `POST /api/v1/favorites/toggle` (или `POST /api/v1/favorites/:productId`) — добавить или переключить статус товара в избранном.
* `DELETE /api/v1/favorites/:productId` — удалить товар из списка избранного.
* `DELETE /api/v1/favorites` — очистить список избранного.

---

## 9. Заказы и оформление (`/api/v1/orders`)

### `POST /api/v1/orders`
Создание нового заказа.
* Выполняет проверку и списание складских остатков `stock`.
* Рассчитывает скидку по активному промокоду (`ARC2026`, `WELCOME`, `PRODEV`).
* Опционально добавляет гарантийное обслуживание **ArcCare+** (+8% к сумме).
* Очищает корзину покупателя после успешного оформления.

* **Тело запроса:**
```json
{
  "recipientName": "Алексей Морозов",
  "contactPhone": "+7 (999) 000-11-22",
  "deliveryAddress": "г. Москва, ул. Арбат, д. 15, кв. 10",
  "paymentMethod": "CARD",
  "promoCode": "ARC2026",
  "warrantyCare": true,
  "comment": "Позвонить за час до доставки",
  "items": [
    { "productId": "prod-arc-phone-x", "quantity": 1 }
  ]
}
```

### `GET /api/v1/orders`
История заказов текущего пользователя.

### `GET /api/v1/orders/purchased`
Возвращает массив идентификаторов товаров, которые пользователь уже успешно приобрел и оплатил (используется для активации формы отзывов).

### `GET /api/v1/orders/:id`
Детальная информация о заказе.

### `PATCH /api/v1/orders/:id/cancel`
Отмена заказа клиентом с автоматическим возвратом зарезервированного товара обратно на склад.

---

## 10. Дополнительные бизнес-сервисы (`/api/v1/promocodes`, `trade-in`, `b2b`, `chat`)

### 10.1. Промокоды
* `GET /api/v1/promocodes` — список активных маркетинговых промокодов.
* `POST /api/v1/promocodes/validate` — расчет точной скидки под заданную сумму корзины:
  ```json
  { "code": "ARC2026", "cartTotal": 59990 }
  ```

### 10.2. Программа Trade-In
* `GET /api/v1/trade-in` — список заявок на оценку.
* `POST /api/v1/trade-in/estimate` — экспресс-оценка старого гаджета по категории, бренду и состоянию с выпуском персонального промокода на скидку:
  ```json
  {
    "deviceCategory": "smartphones",
    "brand": "Apple",
    "model": "iPhone 13",
    "condition": "good"
  }
  ```

### 10.3. B2B Commercial Quotes (Корпоративные счета)
* `GET /api/v1/b2b/quotes` — реестр сформированных счетов.
* `POST /api/v1/b2b/quote` — мгновенная генерация коммерческого предложения для юридических лиц с расчетом НДС 20% и оптовой скидки 7% (при заказе от 5 единиц техники).

### 10.4. Интерактивный чат поддержки
* `GET /api/v1/chat` — история переписки текущей сессии.
* `POST /api/v1/chat` — отправка вопроса консультанту. Серверный умный автоответчик анализирует контекст запроса (доставка, гарантия ArcCare, Сплит, рассрочка, Trade-In, софт) и возвращает квалифицированный ответ за секунды.
* `DELETE /api/v1/chat` — очистка диалога.

---

## 11. Административная панель (`/api/v1/admin`)

Доступна исключительно пользователям с ролью `ADMIN` (заголовок Authorization или admin-cookie):
* `GET /api/v1/admin/stats` — сводная финансовая аналитика: общая выручка, средний чек (AOV), плановая маржинальность 22%, распределение заказов по статусам, предупреждения о товарах с низким остатком (`lowStock`).
* `GET /api/v1/admin/orders` — реестр всех заказов магазина с фильтрацией и деталями клиентов.
* `PATCH /api/v1/admin/orders/:id/status` — изменение статуса заказа (`PENDING` -> `PAID` -> `SHIPPED` -> `DELIVERED` -> `CANCELLED`). При отмене заказа товары автоматически возвращаются на склад.
* `POST /api/v1/admin/products` — добавление нового товара.
* `PATCH /api/v1/admin/products/:id` — редактирование цены, остатков, характеристик и медиа.
* `DELETE /api/v1/admin/products/:id` — удаление товара.
* `GET /api/v1/admin/users` — список зарегистрированных пользователей со статистикой покупок.
* `PATCH /api/v1/admin/users/:id/role` — назначение роли администратора или покупателя.
* `POST`, `PATCH`, `DELETE /api/v1/admin/banners` — управление рекламными кампаниями.
* `POST`, `PATCH`, `DELETE /api/v1/admin/categories` — управление каталогом категорий.

---

## 12. Примеры вызовов через cURL

### 1. Авторизация покупателя
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"demo@arcshop.com","password":"demo12345"}'
```

### 2. Запрос каталога с фильтром и сортировкой
```bash
curl -X GET "http://localhost:3000/api/v1/products?category=smartphones&sort=popular"
```

### 3. Расчет сравнения двух товаров
```bash
curl -X POST http://localhost:3000/api/v1/products/compare \
  -H "Content-Type: application/json" \
  -d '{"ids":["prod-arc-phone-x","prod-nova-s5"]}'
```

### 4. Оформление заказа с промокодом
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "recipientName": "Алексей Морозов",
    "deliveryAddress": "г. Москва, ул. Ленина, д. 10",
    "contactPhone": "+79990001122",
    "promoCode": "ARC2026",
    "paymentMethod": "CARD",
    "items": [{"productId":"prod-arc-phone-x","quantity":1}]
  }'
```
