import dotenv from 'dotenv';
import path from 'path';
import { envSchema } from './schemas.js';
import { logger } from '../utils/logger.js';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local .env if present

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error({ errors: parsedEnv.error.format() }, 'Invalid environment configuration');
  throw new Error('Environment configuration validation failed');
}

export const config = parsedEnv.data;
export default config;
