import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

export async function query<T extends pkg.QueryResultRow = pkg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pkg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: res.rowCount }, 'Executed PostgreSQL query');
    return res;
  } catch (error) {
    logger.error({ text, error }, 'PostgreSQL query error');
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 AS healthy, postgis_full_version() AS postgis');
    const latencyMs = Date.now() - start;
    return {
      isHealthy: res.rows.length > 0,
      latencyMs
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ errorMsg }, 'Database health check failed');
    return {
      isHealthy: false,
      latencyMs: Date.now() - start,
      error: errorMsg
    };
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('PostgreSQL connection pool closed');
}

export default pool;
