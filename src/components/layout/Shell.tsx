import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';
import { useShop } from '../../presenter/shop-context';
import { CheckoutModal } from '../checkout/CheckoutModal';
import { ProductModal } from '../catalog/ProductModal';
import { Deco } from '../ui/Form';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { CartButton, FavoritesButton, SupportButton } from './ShopPanels';
import { ThemeMenu } from '../ui/ThemeMenu';

const NAV_ITEMS: Array<{ to: string; key: TranslationKey; icon: IconName }> = [
  { to: '/', key: 'nav.catalog', icon: 'grid' },
  { to: '/smartphones', key: 'nav.smartphones', icon: 'smartphone' },
  { to: '/laptops', key: 'nav.laptops', icon: 'laptop' },
  { to: '/peripherals', key: 'nav.peripherals', icon: 'headphones' },
  { to: '/accessories', key: 'nav.accessories', icon: 'bag' },
  { to: '/drivers-software', key: 'nav.software', icon: 'book' },
  { to: '/compare', key: 'nav.compare', icon: 'scale' },
];

const CATALOG_PATHS = new Set([
  '/',
  '/smartphones',
  '/laptops',
  '/peripherals',
  '/accessories',
  '/drivers-software',
]);

export function Shell({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { compareIds } = useShop();
  const { searchQuery, setSearchQuery } = useCatalog();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && !CATALOG_PATHS.has(location.pathname)) {
      navigate('/');
    }
  };

  return (
    <div className={menuOpen ? 'app menu-open' : 'app'}>
      <Deco />
      <div className="backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <aside className="sidebar" aria-label={t('shell.menu')}>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{t(item.key)}</span>
              {item.to === '/compare' && compareIds.length >= 2 && (
                <span className="tab-count">{compareIds.length}</span>
              )}
            </NavLink>
          ))}
          {user && (
            <NavLink
              to="/orders"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="truck" />
              <span>{t('nav.orders')}</span>
            </NavLink>
          )}
        </nav>

        {user ? (
          <div className="sidebar-footer user-card">
            <div className="avatar" aria-hidden="true">
              <Icon name="user" />
            </div>
            <div className="user-info">
              <div className="user-name">{user.login}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <Link
              to="/settings"
              className="settings-link"
              aria-label={t('shell.settings')}
              title={t('shell.settings')}
            >
              <Icon name="gear" />
            </Link>
          </div>
        ) : (
          <div className="sidebar-footer sidebar-guest">
            <Link to="/login" className="btn btn-block" onClick={() => setMenuOpen(false)}>
              {t('shell.login')}
            </Link>
            <Link to="/register" className="btn btn-block" onClick={() => setMenuOpen(false)}>
              {t('shell.register')}
            </Link>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="burger"
            aria-label={menuOpen ? t('shell.closeMenu') : t('shell.menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="menu" />
          </button>

          <Link to="/" className="logo">
            <span>ARC</span>SHOP
          </Link>

          <div className="search" role="search">
            <Icon name="search" />
            <input
              type="search"
              placeholder={t('shell.search')}
              aria-label={t('shell.search')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                aria-label={t('shell.searchClear')}
                title={t('shell.searchClear')}
                onClick={() => setSearchQuery('')}
              >
                <Icon name="x" />
              </button>
            )}
          </div>

          <div className="actions">
            <ThemeMenu />
            <SupportButton />
            <FavoritesButton />
            <CartButton />
          </div>
        </header>

        {children}
      </div>

      <ProductModal />
      <CheckoutModal />
    </div>
  );
}
