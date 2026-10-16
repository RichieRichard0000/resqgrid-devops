import { Request, Response, NextFunction } from 'express';
import { httpRequestDurationSeconds, httpRequestsTotal } from '../metrics/index.js';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const durationMs = Math.round(durationSeconds * 1000 * 100) / 100;

    // Normalize route to avoid high cardinality metrics (e.g. replace UUIDs/IDs)
    let route = req.baseUrl + (req.route?.path || req.path);
    if (!route || route === '') route = req.path;
    // Replace standard UUID patterns with ':id'
    route = route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

    const statusCode = res.statusCode.toString();

    // Record Prometheus metrics
    httpRequestDurationSeconds.observe(
      { method: req.method, route, status_code: statusCode },
      durationSeconds
    );
    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });

    // Structured logging
    const logData = {
      method: req.method,
      url: req.originalUrl,
      route,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Warning');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
}
