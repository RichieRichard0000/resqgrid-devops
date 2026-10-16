import { Router, Request, Response } from 'express';
import { providerManager } from '../providers/index.js';

export const providerRouter = Router();

/**
 * GET /api/v1/providers
 * Returns list of registered disaster data providers and their upstream status
 */
providerRouter.get('/', async (_req: Request, res: Response) => {
  const providers = providerManager.getAllProviders();
  const healthMap = await providerManager.checkAllHealth();

  const data = providers.map((p) => ({
    name: p.name,
    isSimulated: p.isSimulated,
    isHealthy: healthMap[p.name] ?? false
  }));

  res.status(200).json({
    status: 'success',
    data: { providers: data }
  });
});

export default providerRouter;
