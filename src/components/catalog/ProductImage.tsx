import { useState } from 'react';
import type { Category } from '../../model/specs';
import type { Product } from '../../model/types';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

const CATEGORY_ICON: Record<Category, IconName> = {
  smartphones: 'smartphone',
  laptops: 'laptop',
  peripherals: 'headphones',
  accessories: 'bag',
  software: 'book',
};

function resolveImageUrl(product: Product): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const fallbackByCategory: Record<Category, string> = {
    smartphones: `${base}images/arc-phone-x.svg`,
    laptops: `${base}images/arc-book-15-pro.svg`,
    peripherals: `${base}images/arc-pulse-headset.svg`,
    accessories: `${base}images/arc-charge-65.svg`,
    software: `${base}images/arc-driver-suite.svg`,
  };

  const img = product.image;
  if (!img) {
    return fallbackByCategory[product.category] || '';
  }

  // Handle legacy Unsplash URLs (e.g. from cached localStorage or DB)
  if (img.includes('unsplash.com')) {
    if (img.includes('1598327105666') || product.id === 'prod-arc-phone-x') return `${base}images/arc-phone-x.svg`;
    if (img.includes('1511707171634') || product.id === 'prod-nova-s5') return `${base}images/nova-s5.svg`;
    if (img.includes('1517336714731') || product.category === 'laptops') return `${base}images/arc-book-15-pro.svg`;
    if (img.includes('1505740420928') || product.id === 'prod-arc-pulse-headset') return `${base}images/arc-pulse-headset.svg`;
    if (img.includes('1527864550417') || product.id === 'prod-nova-strike-mouse') return `${base}images/nova-strike-mouse.svg`;
    if (img.includes('1583863788434') || product.category === 'accessories') return `${base}images/arc-charge-65.svg`;
    return fallbackByCategory[product.category] || '';
  }

  // Handle relative image paths
  if (img.startsWith('/images/')) {
    return `${base}images/${img.slice(8)}`;
  }
  if (img.startsWith('images/')) {
    return `${base}${img}`;
  }

  return img;
}

export function ProductImage({ product, className = 'pimg' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(product);

  if (src && !failed) {
    return (
      <img
        className={className}
        src={src}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${className} pimg-ph`} aria-hidden="true">
      <Icon name={CATEGORY_ICON[product.category]} />
    </div>
  );
}
