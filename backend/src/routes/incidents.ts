import { Router, Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incidentService.js';
import {
  createIncidentSchema,
  updateStatusSchema,
  queryIncidentsSchema,
  simulateIncidentInputSchema
} from '../config/schemas.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { realtimeManager } from '../socket/index.js';
import { simulatedProvider } from '../providers/simulatedProvider.js';
import { providerManager } from '../providers/index.js';
import { logger } from '../utils/logger.js';

export const incidentRouter = Router();

/**
 * GET /api/v1/incidents
 * List incidents with optional filtering, pagination, and PostGIS radius search
 */
incidentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = queryIncidentsSchema.parse(req.query);
    const result = await incidentService.listIncidents({
      page: filters.page,
      limit: filters.limit,
      type: filters.type,
      severity: filters.severity,
      status: filters.status,
      is_simulated: filters.is_simulated,
      search: filters.search,
      lat: filters.lat,
      lon: filters.lon,
      radius_km: filters.radius_km
    });

    res.status(200).json({
      status: 'success',
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/incidents/nearby
 * Convenience endpoint for spatial proximity queries (supports lat/lon/radius_km or latitude/longitude/radiusKm)
 */
incidentRouter.get('/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ?? req.query.latitude;
    const lon = req.query.lon ?? req.query.longitude;
    const radius_km = req.query.radius_km ?? req.query.radiusKm ?? 50;

    const result = await incidentService.listIncidents({
      lat: lat !== undefined ? Number(lat) : undefined,
      lon: lon !== undefined ? Number(lon) : undefined,
      radius_km: radius_km !== undefined ? Number(radius_km) : undefined,
      page: 1,
      limit: 50
    });

    res.status(200).json({
      status: 'success',
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/incidents/:id
 * Retrieve a single incident by UUID
 */
incidentRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/incidents
 * Create a new incident (Protected: Admin or Responder)
 */
incidentRouter.post(
  '/',
  authenticate,
  requireRole('admin', 'responder'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createIncidentSchema.parse(req.body);
      const created = await incidentService.createIncident(input, req.user?.id);

      // Real-time broadcast to connected clients
      await realtimeManager.broadcastIncident(created, 'CREATED');

      res.status(201).json({
        status: 'success',
        message: 'Incident reported and broadcasted successfully',
        data: { incident: created }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/incidents/:id/status
 * Update incident status (Protected: Admin or Responder)
 */
incidentRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'responder'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = updateStatusSchema.parse(req.body);
      const updated = await incidentService.updateIncidentStatus(req.params.id, status);

      // Real-time broadcast
      await realtimeManager.broadcastIncident(updated, 'STATUS_CHANGED');

      res.status(200).json({
        status: 'success',
        message: `Incident status updated to '${status}'`,
        data: { incident: updated }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/incidents/simulate
 * Dispatch a simulated drill incident near coordinates (Protected: Admin or Responder)
 */
incidentRouter.post(
  '/simulate',
  authenticate,
  requireRole('admin', 'responder'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = simulateIncidentInputSchema.parse(req.body);
      // Default to Chennai/SRM region if not specified
      const lat = input.latitude ?? 12.8230;
      const lon = input.longitude ?? 80.0444;
      const type = input.incident_type ?? 'flood';
      const severity = input.severity ?? 'high';

      const simulatedInput = simulatedProvider.generateNearLocation(
        lat,
        lon,
        type,
        severity,
        input.title
      );

      if (input.location_name) {
        simulatedInput.location_name = input.location_name;
      }
      if (input.radius_km) {
        simulatedInput.radius_km = input.radius_km;
      }

      const created = await incidentService.createIncident(simulatedInput, req.user?.id);

      // Broadcast live to all connected WebSocket clients with geofence calculation
      await realtimeManager.broadcastIncident(created, 'CREATED');

      logger.info({ id: created.id, title: created.title }, 'Dispatched manual simulated drill incident');

      res.status(201).json({
        status: 'success',
        message: 'Simulated disaster event dispatched and broadcasted to clients in real-time',
        data: { incident: created }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/incidents/ingest
 * Trigger on-demand ingestion from registered disaster event providers
 */
incidentRouter.post(
  '/ingest',
  authenticate,
  requireRole('admin', 'responder'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = providerManager.getAllProviders();
      let ingestedCount = 0;
      const details: Record<string, number> = {};

      for (const provider of providers) {
        try {
          const events = await provider.fetchEvents();
          let countForProvider = 0;
          for (const event of events) {
            try {
              const created = await incidentService.createIncident(event);
              await realtimeManager.broadcastIncident(created, 'CREATED');
              countForProvider++;
            } catch (createErr) {
              // Ignore duplicate external IDs
              logger.debug({ error: createErr }, 'Skipped event or duplicate during ingestion');
            }
          }
          details[provider.name] = countForProvider;
          ingestedCount += countForProvider;
        } catch (providerErr) {
          logger.warn({ provider: provider.name, providerErr }, 'Provider ingestion cycle error');
          details[provider.name] = 0;
        }
      }

      res.status(200).json({
        status: 'success',
        message: `Ingestion completed. Ingested ${ingestedCount} new events.`,
        data: {
          totalIngested: ingestedCount,
          byProvider: details
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default incidentRouter;
