import { Router, Request, Response } from 'express';
import { register } from '../metrics/index.js';

export const metricsRouter = Router();

/**
 * Prometheus metrics scraping endpoint
 */
metricsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating Prometheus metrics');
  }
});

export default metricsRouter;
