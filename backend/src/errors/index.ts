import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { applicationErrorsTotal } from '../metrics/index.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions for this resource') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  if (err instanceof ZodError) {
    applicationErrorsTotal.inc({ error_type: 'ValidationError', component: 'api' });
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      })),
      timestamp
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      applicationErrorsTotal.inc({ error_type: 'ServerError', component: 'api' });
      logger.error({ err }, `Server Error: ${err.message}`);
    } else {
      applicationErrorsTotal.inc({ error_type: 'ClientError', component: 'api' });
    }

    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      timestamp
    });
    return;
  }

  // Unhandled / system errors
  applicationErrorsTotal.inc({ error_type: 'UnhandledError', component: 'api' });
  logger.error({ err }, `Unhandled exception: ${err.message}`);

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp
  });
}
