import { createApiApp } from './app';

const app = createApiApp();

// 404 handler for unrecognized API routes on Vercel
app.all('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Support both CommonJS (app / listener) and ESM (.default) resolution
(app as any).default = app;

export default app;
