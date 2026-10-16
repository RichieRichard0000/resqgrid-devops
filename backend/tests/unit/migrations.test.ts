import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Database Migrations and Seeds Integrity', () => {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const seedsDir = path.resolve(__dirname, '../../../database/seeds');

  it('contains required migration SQL files in alphabetical sequence', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThanOrEqual(4);

    expect(files).toContain('001_init_postgis.sql');
    expect(files).toContain('002_create_users_table.sql');
    expect(files).toContain('003_create_incidents_table.sql');
    expect(files).toContain('004_create_alerts_table.sql');
  });

  it('ensures migration 001 enables postgis and uuid extensions', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '001_init_postgis.sql'), 'utf-8');
    expect(sql).toContain('postgis');
    expect(sql).toContain('uuid-ossp');
  });

  it('ensures migration 002 creates users table with RBAC checks and indices', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '002_create_users_table.sql'), 'utf-8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).toContain("'admin', 'responder', 'viewer'");
    expect(sql).toContain('idx_users_email');
    expect(sql).toContain('idx_users_role');
  });

  it('ensures migration 003 creates incidents table with PostGIS geometry and GiST index', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '003_create_incidents_table.sql'), 'utf-8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS incidents');
    expect(sql).toContain('geometry(Point, 4326)');
    expect(sql).toContain('USING GIST (geom)');
    expect(sql).toContain('sync_incident_geom');
    expect(sql).toContain("'earthquake', 'flood', 'severe_weather', 'emergency'");
    expect(sql).toContain("'low', 'medium', 'high', 'critical'");
  });

  it('ensures migration 004 creates alerts audit table', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '004_create_alerts_table.sql'), 'utf-8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS alerts');
    expect(sql).toContain('distance_km');
    expect(sql).toContain('REFERENCES incidents(id)');
  });

  it('contains idempotent seed SQL with conflict handling', () => {
    expect(fs.existsSync(seedsDir)).toBe(true);
    const sql = fs.readFileSync(path.join(seedsDir, '001_initial_seed.sql'), 'utf-8');

    // Users seed
    expect(sql).toContain('admin@resqgrid.local');
    expect(sql).toContain('responder@resqgrid.local');
    expect(sql).toContain('citizen@resqgrid.local');
    expect(sql).toContain('ON CONFLICT (email) DO UPDATE');

    // Incidents seed (mix of official and simulated)
    expect(sql).toContain('Kattankulathur, SRM Institute Corridor, Chennai');
    expect(sql).toContain('SIMULATED');
    expect(sql).toContain('OPEN_METEO');
    expect(sql).toContain('USGS');
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
  });
});
