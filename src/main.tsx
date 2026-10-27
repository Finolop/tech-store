import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './presenter/auth-context';
import { CatalogProvider } from './presenter/catalog-context';
import { I18nProvider } from './presenter/i18n-context';
import { ShopProvider } from './presenter/shop-context';
import { ThemeProvider } from './presenter/theme-context';
import { applyTheme, getTheme } from './model/theme';
import './index.css';

applyTheme(getTheme());

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <CatalogProvider>
              <ShopProvider>
                <App />
              </ShopProvider>
            </CatalogProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
