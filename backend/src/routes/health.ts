import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db/pool.js';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

/**
 * Liveness probe: verifies process is alive and responsive
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
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
      database: dbHealth,
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    ready: true,
    database: {
      isHealthy: true,
      latencyMs: dbHealth.latencyMs
    },
    timestamp: new Date().toISOString()
  });
});

export default healthRouter;
