import { createApiApp } from '../server/app';

const app = createApiApp();

// 404 handler for unrecognized API routes on Vercel
app.all('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export default app;
