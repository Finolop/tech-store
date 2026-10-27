/**
 * Общие для клиента и сервера типы каталога и описание характеристик по категориям.
 * Именно по этому описанию строятся таблица характеристик и «умное» сравнение.
 */
export type Category = 'smartphones' | 'laptops' | 'peripherals' | 'accessories' | 'software';

export const CATEGORIES: Category[] = ['smartphones', 'laptops', 'peripherals', 'accessories', 'software'];

/** Адрес раздела сайта для каждой категории */
export const CATEGORY_ROUTE: Record<Category, string> = {
  smartphones: '/smartphones',
  laptops: '/laptops',
  peripherals: '/peripherals',
  accessories: '/accessories',
  software: '/drivers-software',
};

export interface L10n {
  ru: string;
  en: string;
}

export type SpecValue = number | boolean | L10n;

export interface SpecDef {
  key: string;
  label: L10n;
  unit?: L10n;
  /** higher — чем больше, тем лучше; lower — чем меньше, тем лучше; none — просто информация */
  better: 'higher' | 'lower' | 'none';
  /** вес в итоговом балле, 0 — в баллах не участвует */
  weight: number;
  /** показывать в «коротких» характеристиках в карточке и окне товара */
  highlight?: boolean;
}

const u = (ru: string, en = ru): L10n => ({ ru, en });
const WARRANTY: SpecDef = {
  key: 'warranty',
  label: u('Гарантия', 'Warranty'),
  unit: u('мес.', 'mo.'),
  better: 'higher',
  weight: 1,
};

export const SPEC_DEFS: Record<Category, SpecDef[]> = {
  smartphones: [
    { key: 'chip', label: u('Процессор', 'Chip'), better: 'none', weight: 0, highlight: true },
    { key: 'screen', label: u('Диагональ экрана', 'Screen size'), unit: u('"', '"'), better: 'none', weight: 0 },
    { key: 'refresh', label: u('Частота экрана', 'Refresh rate'), unit: u('Гц', 'Hz'), better: 'higher', weight: 1 },
    { key: 'ram', label: u('Оперативная память', 'RAM'), unit: u('ГБ', 'GB'), better: 'higher', weight: 2, highlight: true },
    { key: 'storage', label: u('Встроенная память', 'Storage'), unit: u('ГБ', 'GB'), better: 'higher', weight: 2, highlight: true },
    { key: 'camera', label: u('Основная камера', 'Main camera'), unit: u('Мп', 'MP'), better: 'higher', weight: 2 },
    { key: 'battery', label: u('Аккумулятор', 'Battery'), unit: u('мА·ч', 'mAh'), better: 'higher', weight: 3, highlight: true },
    { key: 'charging', label: u('Зарядка', 'Charging'), unit: u('Вт', 'W'), better: 'higher', weight: 1 },
    { key: 'weight', label: u('Вес', 'Weight'), unit: u('г', 'g'), better: 'lower', weight: 1 },
    { key: 'nfc', label: u('NFC', 'NFC'), better: 'higher', weight: 0.5 },
    WARRANTY,
  ],
  laptops: [
    { key: 'cpu', label: u('Процессор', 'Processor'), better: 'none', weight: 0, highlight: true },
    { key: 'cores', label: u('Ядер процессора', 'CPU cores'), better: 'higher', weight: 2 },
    { key: 'gpu', label: u('Видеокарта', 'Graphics'), better: 'none', weight: 0 },
    { key: 'ram', label: u('Оперативная память', 'RAM'), unit: u('ГБ', 'GB'), better: 'higher', weight: 3, highlight: true },
    { key: 'storage', label: u('Накопитель SSD', 'SSD storage'), unit: u('ГБ', 'GB'), better: 'higher', weight: 2, highlight: true },
    { key: 'screen', label: u('Диагональ экрана', 'Screen size'), unit: u('"', '"'), better: 'none', weight: 0 },
    { key: 'refresh', label: u('Частота экрана', 'Refresh rate'), unit: u('Гц', 'Hz'), better: 'higher', weight: 1 },
    { key: 'battery', label: u('Время работы', 'Battery life'), unit: u('ч', 'h'), better: 'higher', weight: 3, highlight: true },
    { key: 'weight', label: u('Вес', 'Weight'), unit: u('кг', 'kg'), better: 'lower', weight: 1.5 },
    WARRANTY,
  ],
  peripherals: [
    { key: 'type', label: u('Тип', 'Type'), better: 'none', weight: 0, highlight: true },
    { key: 'connection', label: u('Подключение', 'Connection'), better: 'none', weight: 0, highlight: true },
    { key: 'latency', label: u('Задержка', 'Latency'), unit: u('мс', 'ms'), better: 'lower', weight: 3 },
    { key: 'battery', label: u('Автономность', 'Battery life'), unit: u('ч', 'h'), better: 'higher', weight: 2, highlight: true },
    { key: 'weight', label: u('Вес', 'Weight'), unit: u('г', 'g'), better: 'lower', weight: 1.5 },
    { key: 'rgb', label: u('RGB-подсветка', 'RGB lighting'), better: 'higher', weight: 0.5 },
    WARRANTY,
  ],
  accessories: [
    { key: 'type', label: u('Тип', 'Type'), better: 'none', weight: 0, highlight: true },
    { key: 'power', label: u('Мощность', 'Power'), unit: u('Вт', 'W'), better: 'higher', weight: 3, highlight: true },
    { key: 'ports', label: u('Количество портов', 'Ports'), better: 'higher', weight: 1.5 },
    { key: 'cable', label: u('Длина кабеля', 'Cable length'), unit: u('м', 'm'), better: 'higher', weight: 1 },
    { key: 'weight', label: u('Вес', 'Weight'), unit: u('г', 'g'), better: 'lower', weight: 1 },
    WARRANTY,
  ],
  software: [
    { key: 'platforms', label: u('Платформы', 'Platforms'), better: 'none', weight: 0, highlight: true },
    { key: 'version', label: u('Версия', 'Version'), better: 'none', weight: 0, highlight: true },
    { key: 'devices', label: u('Устройств на лицензию', 'Devices per license'), better: 'higher', weight: 3 },
    { key: 'support', label: u('Поддержка', 'Support'), unit: u('мес.', 'mo.'), better: 'higher', weight: 2 },
    { key: 'size', label: u('Размер установщика', 'Installer size'), unit: u('МБ', 'MB'), better: 'lower', weight: 1 },
  ],
};
