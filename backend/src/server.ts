import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { realtimeManager } from './socket/index.js';
import { closePool, checkDatabaseHealth } from './db/pool.js';
import { logger } from './utils/logger.js';
import { providerManager } from './providers/index.js';
import { incidentService } from './services/incidentService.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO real-time manager
realtimeManager.initialize(server, config.CORS_ORIGIN);

// Background ingestion worker
let ingestionIntervalId: NodeJS.Timeout | null = null;

async function runIngestionCycle(): Promise<void> {
  try {
    const providers = providerManager.getAllProviders();
    for (const provider of providers) {
      if (provider.isSimulated) continue; // Run external feeds in background
      try {
        const events = await provider.fetchEvents();
        for (const event of events) {
          try {
            const created = await incidentService.createIncident(event);
            await realtimeManager.broadcastIncident(created, 'CREATED');
          } catch {
            // Skip duplicates
          }
        }
      } catch (err) {
        logger.warn({ provider: provider.name, err }, 'Background ingestion error for provider');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Fatal error during background ingestion cycle');
  }
}

// Start server
server.listen(config.PORT, config.HOST, async () => {
  logger.info(
    {
      port: config.PORT,
      host: config.HOST,
      env: config.NODE_ENV
    },
    `ResQGrid API & Real-Time Engine running on http://${config.HOST}:${config.PORT}`
  );

  // Check DB readiness on boot
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.isHealthy) {
    logger.info({ latencyMs: dbHealth.latencyMs }, 'Connected to PostgreSQL database with PostGIS spatial engine.');
  } else {
    logger.warn({ error: dbHealth.error }, 'PostgreSQL is not yet reachable. Health checks will return 503 until connected.');
  }

  // Schedule background external provider ingestion if enabled
  if (config.ENABLE_INGESTION_CRON && config.NODE_ENV !== 'test') {
    ingestionIntervalId = setInterval(runIngestionCycle, config.INGESTION_INTERVAL_MS);
    logger.info({ intervalMs: config.INGESTION_INTERVAL_MS }, 'Started periodic disaster provider ingestion worker');
  }
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received termination signal. Commencing graceful shutdown...');

  if (ingestionIntervalId) {
    clearInterval(ingestionIntervalId);
  }

  server.close(async () => {
    logger.info('HTTP and WebSocket server closed to new connections.');
    try {
      await closePool();
      logger.info('Database pool drained. Process exit clean.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database pool shutdown');
      process.exit(1);
    }
  });

  // Force exit after 10s if hung
  setTimeout(() => {
    logger.error('Shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
