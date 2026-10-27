import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import apiApp from './src/server/app';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Mount the API backend app
  app.use(apiApp);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      console.warn(
        `[Server Warn] Каталог сборки 'dist' не найден! Запустите 'npm run build' перед запуском в production режиме.`,
      );
    }
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(
          '<h3>ARCSHOP: Проект запущен в production режиме, но папка сборки dist не найдена.</h3><p>Выполните команду <code>npm run build</code> и перезапустите сервер.</p>',
        );
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Сервер ARCSHOP успешно запущен на http://localhost:${PORT}`);
    console.log(`[Server] Режим работы: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  });
}

startServer();
