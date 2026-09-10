import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from './routes';

dotenv.config();

/**
 * Creates and configures the Express API application instance.
 * Shared between standalone server (server.ts) and Vercel serverless functions (api/index.ts).
 */
export function createApiApp(): express.Express {
  const app = express();

  // Body parsers with rawBody preservation for payment webhooks
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Middleware to normalize incoming URL across Vercel edge rewrites and direct server access
  app.use((req, _res, next) => {
    const matchedPath =
      (req.headers['x-matched-path'] as string) ||
      (req.headers['x-now-route-matches'] as string) ||
      (req.headers['x-forwarded-uri'] as string);

    if (
      typeof matchedPath === 'string' &&
      matchedPath.startsWith('/api') &&
      (req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?'))
    ) {
      const queryIndex = req.url.indexOf('?');
      const query = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
      req.url = matchedPath + query;
    }
    next();
  });

  // Mount API routes at /api
  app.use('/api', apiRouter);

  // Also mount directly as fallback for environments where the /api prefix was rewritten
  app.use(apiRouter);

  // Global error handler middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred processing your request.' : err.message,
    });
  });

  return app;
}
