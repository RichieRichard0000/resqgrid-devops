import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import * as poolModule from '../../src/db/pool.js';

describe('Observability Endpoints (/health, /metrics)', () => {
  const app = createApp();

  describe('GET /health/live', () => {
    it('returns HTTP 200 with process liveness and uptime', async () => {
      const res = await request(app).get('/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('returns HTTP 200 when database connectivity is healthy', async () => {
      vi.spyOn(poolModule, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: true,
        latencyMs: 1.5
      });

      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
      expect(res.body.database.isHealthy).toBe(true);
      expect(res.body.database.latencyMs).toBe(1.5);
    });

    it('returns HTTP 503 when database connectivity is down', async () => {
      vi.spyOn(poolModule, 'checkDatabaseHealth').mockResolvedValueOnce({
        isHealthy: false,
        latencyMs: 10,
        error: 'Connection refused to postgres:5432'
      });

      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.ready).toBe(false);
      expect(res.body.database.error).toBeDefined();
    });
  });

  describe('GET /metrics', () => {
    it('returns Prometheus-compatible text metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('http_request_duration_seconds');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('active_socket_connections');
      expect(res.text).toContain('disaster_events_ingested_total');
    });
  });
});
