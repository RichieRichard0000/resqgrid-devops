import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, NotFoundError } from './errors/index.js';
import { healthRouter } from './routes/health.js';
import { metricsRouter } from './routes/metrics.js';
import { authRouter } from './routes/auth.js';
import { incidentRouter } from './routes/incidents.js';
import { providerRouter } from './routes/providers.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false // Disabled for API/metrics view & dev friendliness
    })
  );

  // CORS configuration
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
    })
  );

  // JSON request body parser
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request duration and Prometheus instrumentation
  app.use(requestLogger);

  // Global release identity headers for blue-green routing verification
  app.use((_req, res, next) => {
    res.setHeader('X-Release-Color', config.RELEASE_COLOR);
    res.setHeader('X-Release-Commit', config.RELEASE_COMMIT);
    next();
  });

  // Observability & System Routes
  app.use('/health', healthRouter);
  app.use('/metrics', metricsRouter);

  // API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/incidents', incidentRouter);
  app.use('/api/v1/providers', providerRouter);

  // Root welcome / status
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'ResQGrid API Engine',
      version: '1.0.0',
      phase: 'Phase 1 - Application Foundation',
      documentation: '/docs/api.md',
      health: '/health/ready',
      metrics: '/metrics'
    });
  });

  // Catch-all 404 handler
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
