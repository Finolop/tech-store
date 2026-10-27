import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/products.routes';
import reviewRoutes from './routes/reviews.routes';
import questionRoutes from './routes/questions.routes';
import cartRoutes from './routes/cart.routes';
import favoritesRoutes from './routes/favorites.routes';
import orderRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import servicesRoutes from './routes/services.routes';
import docsRoutes from './routes/docs.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const tag = status >= 500 ? '[ERR]' : status >= 400 ? '[WARN]' : '[OK]';
    console.log(`${tag} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', ok: true, message: 'Backend is running smoothly' });
});

// v1 API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/products', reviewRoutes);
app.use('/api/v1', questionRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', servicesRoutes);
app.use('/api/v1/endpoints', docsRoutes);

// Compatibility aliases for frontend /api/*
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', reviewRoutes);
app.use('/api', questionRoutes);
app.use('/api', productRoutes);
app.use('/api', servicesRoutes);
app.use('/api/endpoints', docsRoutes);
app.use('/api', authRoutes);

// 404 handler for unmatched API requests
app.all(['/api', '/api/*'], (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    ok: false,
    error: 'err.notFound',
    message: 'Запрашиваемый API эндпоинт не найден',
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    ok: false,
    error: err.error || 'err.server',
    message: err.message || 'Внутренняя ошибка сервера',
  });
});

export default app;
