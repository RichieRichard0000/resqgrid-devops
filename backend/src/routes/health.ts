import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db/pool.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

// Middleware to inject release identity headers into all health responses
healthRouter.use((_req, res, next) => {
  res.setHeader('X-Release-Color', config.RELEASE_COLOR);
  res.setHeader('X-Release-Commit', config.RELEASE_COMMIT);
  next();
});

/**
 * Liveness probe: verifies process is alive, responsive, and reports active release
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    release: {
      color: config.RELEASE_COLOR,
      commit: config.RELEASE_COMMIT
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe: checks dependencies (PostgreSQL + PostGIS) before routing traffic
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.isHealthy) {
    logger.warn({ dbHealth }, 'Readiness probe failed: database unavailable');
    res.status(503).json({
      status: 'error',
      ready: false,
      release: {
        color: config.RELEASE_COLOR,
        commit: config.RELEASE_COMMIT
      },
      database: dbHealth,
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    ready: true,
    release: {
      color: config.RELEASE_COLOR,
      commit: config.RELEASE_COMMIT
    },
    database: {
      isHealthy: true,
      latencyMs: dbHealth.latencyMs
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Dedicated release version endpoint for blue-green validation and smoke testing
 */
healthRouter.get('/version', (_req: Request, res: Response) => {
  res.status(200).json({
    color: config.RELEASE_COLOR,
    commit: config.RELEASE_COMMIT,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default healthRouter;
