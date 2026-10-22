/**
 * ============================================================================
 * MODULE: Express Application Factory (app.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Factory function that instantiates, configures, and returns the top-level
 * Express HTTP application with security middleware, CORS policies, static
 * asset routers, REST routes, and error handling.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Configures Helmet for HTTP response header hardening (XSS protection,
 *    Content-Security-Policy, cross-origin resource policy).
 * 2. Enforces CORS (Cross-Origin Resource Sharing) whitelist dynamically based
 *    on environment variables.
 * 3. Integrates Morgan HTTP access logging (suppressed during automated tests).
 * 4. Parses JSON and URL-encoded request bodies with size limits (up to 50MB).
 * 5. Mounts the primary `/api/v1` router handling authentication, documents,
 *    workflows, OCR, notifications, AI assistants, and administration.
 * 6. Exposes static file storage under `/uploads` for public avatar photos.
 * 7. Defines custom 404 handler for unknown routes and centralized error
 *    sanitization middleware preventing database/stack trace leakage.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import apiV1Router from './routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError } from './utils/response';

/**
 * Creates and configures the Express application instance.
 * @returns {express.Application} Fully configured Express app.
 */
export function createApp(): express.Application {
  const app = express();

  // Trust exactly one reverse-proxy hop (the Vite dev proxy in local dev, a
  // load balancer in production). Without this, EVERY browser session behind
  // the dev proxy is seen as 127.0.0.1 and shares a single rate-limit bucket —
  // one busy machine could lock all humans out of the login form.
  app.set('trust proxy', 1);

  // 1. Security headers via Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // 2. CORS configuration (allows frontend origin, credentials, and standard HTTP methods)
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // 3. Request HTTP logger
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // 4. Body parsers (supports JSON and urlencoded multipart form fields)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 5. Mount API v1 Routes
  app.use('/api/v1', apiV1Router);

  // 6. Serve static uploads (user avatar images & assets)
  app.use('/uploads', express.static(config.uploadDir));

  // 7. Gateway root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'IUDWAS API Gateway',
      version: '1.0.0',
      status: 'ONLINE',
      docs: '/api/v1/system/health',
      timestamp: new Date().toISOString(),
    });
  });

  // 8. 404 Not Found fallback handler
  app.use((req, res) => {
    sendError(res, 'ENDPOINT_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`, 404);
  });

  // 9. Centralized Error Handler Middleware
  app.use(errorHandler);

  return app;
}
