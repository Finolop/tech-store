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

export function ProductImage({ product, className = 'pimg' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (product.image && !failed) {
    return (
      <img
        className={className}
        src={product.image}
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
