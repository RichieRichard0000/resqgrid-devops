import client from 'prom-client';

// Initialize Prometheus registry and default metrics (CPU, memory, event loop lag, etc.)
export const register = new client.Registry();
register.setDefaultLabels({
  app: 'resqgrid-backend'
});

client.collectDefaultMetrics({ register });

// HTTP Request Duration Histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// HTTP Requests Total Counter
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total count of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Active Socket.IO Connections Gauge
export const activeSocketConnections = new client.Gauge({
  name: 'active_socket_connections',
  help: 'Number of currently active real-time client WebSocket connections',
  registers: [register]
});

// Disaster Events Ingested Counter
export const disasterEventsIngestedTotal = new client.Counter({
  name: 'disaster_events_ingested_total',
  help: 'Total number of disaster incidents ingested by source provider and incident type',
  labelNames: ['provider', 'type', 'is_simulated'],
  registers: [register]
});

// Real-Time Alerts Broadcast Counter
export const alertsBroadcastTotal = new client.Counter({
  name: 'alerts_broadcast_total',
  help: 'Total number of real-time alerts dispatched to connected clients',
  labelNames: ['channel', 'severity'],
  registers: [register]
});

// Application Errors Counter
export const applicationErrorsTotal = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application-level errors encountered',
  labelNames: ['error_type', 'component'],
  registers: [register]
});
