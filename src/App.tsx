import { Navigate, Route, Routes } from 'react-router-dom';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { ComparePage } from './pages/catalog/ComparePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { SettingsPage } from './pages/account/SettingsPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { AdminPage } from './pages/admin/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/smartphones" element={<CatalogPage category="smartphones" />} />
      <Route path="/laptops" element={<CatalogPage category="laptops" />} />
      <Route path="/peripherals" element={<CatalogPage category="peripherals" />} />
      <Route path="/accessories" element={<CatalogPage category="accessories" />} />
      <Route path="/drivers-software" element={<CatalogPage category="software" />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/admin" element={<AdminPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/settings" element={<SettingsPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
