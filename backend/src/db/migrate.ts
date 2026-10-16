import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  const appliedMigrations: string[] = [];

  try {
    logger.info('Starting ResQGrid database migration process...');

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const existingResult = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations'
    );
    const existing = new Set(existingResult.rows.map(r => r.version));

    // 3. Locate migration directory
    const candidates = [
      path.resolve(__dirname, '../../../database/migrations'),
      path.resolve(__dirname, '../../database/migrations'),
      path.resolve(process.cwd(), 'database/migrations'),
      path.resolve(process.cwd(), '../database/migrations')
    ];

    const migrationsDir = candidates.find(dir => fs.existsSync(dir));
    if (!migrationsDir) {
      throw new Error(`Migration directory not found in candidates: ${candidates.join(', ')}`);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!existing.has(file)) {
        logger.info({ migration: file }, `Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          appliedMigrations.push(file);
          logger.info({ migration: file }, `Successfully applied migration: ${file}`);
        } catch (migrationErr) {
          await client.query('ROLLBACK');
          logger.error({ migration: file, error: migrationErr }, `Migration failed: ${file}`);
          throw migrationErr;
        }
      } else {
        logger.debug({ migration: file }, `Migration already applied: ${file}`);
      }
    }

    logger.info(
      { totalApplied: appliedMigrations.length },
      'All database migrations completed successfully.'
    );
    return appliedMigrations;
  } finally {
    client.release();
  }
}

// Allow direct execution: `tsx src/db/migrate.ts`
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      logger.info('Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Migration script failed');
      process.exit(1);
    });
}
