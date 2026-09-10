import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app';

async function startServer() {
  const app = createApiApp();
  const PORT = 3000;

  // 404 handler for unrecognized API routes in standalone server
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Research Manuscript Studio server active on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failure:', err);
  process.exit(1);
});
