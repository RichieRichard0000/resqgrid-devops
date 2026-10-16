import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://resqgrid_user:resqgrid_password@localhost:5432/resqgrid'),
  JWT_SECRET: z.string().min(16).default('super-secret-jwt-key-resqgrid-cse-srm-2026'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5173'),
  USGS_FEED_URL: z.string().url().default('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'),
  USGS_TIMEOUT_MS: z.coerce.number().default(5000),
  INGESTION_INTERVAL_MS: z.coerce.number().default(120000),
  ENABLE_INGESTION_CRON: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

export const incidentTypeEnum = z.enum(['earthquake', 'flood', 'severe_weather', 'emergency']);
export const incidentSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export const incidentStatusEnum = z.enum(['active', 'investigating', 'resolved']);
export const incidentSourceEnum = z.enum(['USGS', 'OPEN_METEO', 'SIMULATED', 'MANUAL_DISPATCH']);
export const userRoleEnum = z.enum(['admin', 'responder', 'viewer']);

export const createIncidentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  incident_type: incidentTypeEnum,
  severity: incidentSeverityEnum,
  status: incidentStatusEnum.default('active'),
  location_name: z.string().min(2, 'Location name must be at least 2 characters').max(255),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radius_km: z.number().positive('Radius must be greater than 0').default(25.0),
  event_time: z.union([z.string().datetime(), z.date()]).optional(),
  source: incidentSourceEnum.default('MANUAL_DISPATCH'),
  is_simulated: z.boolean().default(false),
  external_id: z.string().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).default({})
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(5).optional(),
  incident_type: incidentTypeEnum.optional(),
  severity: incidentSeverityEnum.optional(),
  status: incidentStatusEnum.optional(),
  location_name: z.string().min(2).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const updateStatusSchema = z.object({
  status: incidentStatusEnum
});

export const queryIncidentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: incidentTypeEnum.optional(),
  severity: incidentSeverityEnum.optional(),
  status: incidentStatusEnum.optional(),
  is_simulated: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().positive().max(5000).optional()
});

export const geofenceLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_km: z.number().positive().max(1000).default(50.0)
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: userRoleEnum.default('viewer')
});

export const simulateIncidentInputSchema = z.object({
  title: z.string().optional(),
  incident_type: incidentTypeEnum.optional(),
  severity: incidentSeverityEnum.optional(),
  location_name: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().positive().optional()
});
