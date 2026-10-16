import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeeds(): Promise<void> {
  const client = await pool.connect();

  try {
    logger.info('Starting ResQGrid database seed process...');

    const candidates = [
      path.resolve(__dirname, '../../../database/seeds'),
      path.resolve(__dirname, '../../database/seeds'),
      path.resolve(process.cwd(), 'database/seeds'),
      path.resolve(process.cwd(), '../database/seeds')
    ];

    const seedsDir = candidates.find(dir => fs.existsSync(dir));
    if (!seedsDir) {
      throw new Error(`Seed directory not found in candidates: ${candidates.join(', ')}`);
    }

    const files = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Hash passwords dynamically to guarantee consistency
    const defaultPasswordHash = await bcrypt.hash('Admin123!', 10);
    const responderPasswordHash = await bcrypt.hash('Responder123!', 10);
    const citizenPasswordHash = await bcrypt.hash('Citizen123!', 10);

    for (const file of files) {
      logger.info({ seedFile: file }, `Executing seed file: ${file}`);
      let sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');

      // Replace hashes if needed or run directly
      await client.query('BEGIN');
      try {
        await client.query(sql);
        // Explicitly update users with current dynamic hashes to be 100% sure
        await client.query(
          `UPDATE users SET password_hash = $1 WHERE email = 'admin@resqgrid.local'`,
          [defaultPasswordHash]
        );
        await client.query(
          `UPDATE users SET password_hash = $1 WHERE email = 'responder@resqgrid.local'`,
          [responderPasswordHash]
        );
        await client.query(
          `UPDATE users SET password_hash = $1 WHERE email = 'citizen@resqgrid.local'`,
          [citizenPasswordHash]
        );
        await client.query('COMMIT');
        logger.info({ seedFile: file }, `Successfully executed seed file: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ seedFile: file, err }, `Seed execution failed on: ${file}`);
        throw err;
      }
    }

    logger.info('Seed process completed successfully.');
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeeds()
    .then(() => {
      logger.info('Seed script finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Seed script failed');
      process.exit(1);
    });
}
