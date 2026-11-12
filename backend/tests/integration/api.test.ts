import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import * as poolModule from '../../src/db/pool.js';
import { config } from '../../src/config/index.js';

describe('ResQGrid REST API Integration', () => {
  const app = createApp();

  // Pre-generate tokens for testing RBAC
  const adminToken = jwt.sign(
    { id: '11111111-1111-1111-1111-111111111111', email: 'admin@resqgrid.local', role: 'admin', full_name: 'Admin User' },
    config.JWT_SECRET
  );

  const responderToken = jwt.sign(
    { id: '22222222-2222-2222-2222-222222222222', email: 'responder@resqgrid.local', role: 'responder', full_name: 'Responder User' },
    config.JWT_SECRET
  );

  const viewerToken = jwt.sign(
    { id: '33333333-3333-3333-3333-333333333333', email: 'citizen@resqgrid.local', role: 'viewer', full_name: 'Citizen Observer' },
    config.JWT_SECRET
  );

  const sampleIncident = {
    id: 'aaaaaaa1-0000-0000-0000-000000000001',
    title: 'Urban Waterlogging Advisory',
    description: 'Heavy seasonal precipitation causing flash inundation along GST Road.',
    incident_type: 'flood',
    severity: 'high',
    status: 'active',
    location_name: 'Kattankulathur, Chennai',
    latitude: 12.823,
    longitude: 80.0444,
    radius_km: 15.0,
    event_time: new Date().toISOString(),
    source: 'SIMULATED',
    is_simulated: true,
    external_id: 'SIM-001',
    metadata: {},
    created_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication (/api/v1/auth)', () => {
    it('authenticates user with valid credentials and returns JWT token', async () => {
      const passwordHash = await bcrypt.hash('Admin123!', 10);
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'admin@resqgrid.local',
            password_hash: passwordHash,
            full_name: 'Admin User',
            role: 'admin',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@resqgrid.local',
          password: 'Admin123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@resqgrid.local');
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.password_hash).toBeUndefined(); // Safe user
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            email: 'admin@resqgrid.local',
            password_hash: passwordHash,
            full_name: 'Admin User',
            role: 'admin',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@resqgrid.local',
          password: 'WrongPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects unauthenticated access to /api/v1/auth/me', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns user profile for valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('admin@resqgrid.local');
      expect(res.body.data.user.role).toBe('admin');
    });
  });

  describe('Incident Management (/api/v1/incidents)', () => {
    it('lists incidents with pagination metadata', async () => {
      // Mock count query
      vi.spyOn(poolModule, 'query')
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        // Mock data query
        .mockResolvedValueOnce({
          rows: [sampleIncident],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const res = await request(app).get('/api/v1/incidents?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.data[0].id).toBe(sampleIncident.id);
    });

    it('retrieves incident details by ID', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [sampleIncident],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app).get(`/api/v1/incidents/${sampleIncident.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.incident.title).toBe(sampleIncident.title);
    });

    it('returns 404 for non-existent incident ID', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const res = await request(app).get('/api/v1/incidents/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    it('blocks anonymous creation of incidents with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .send({
          title: 'Unauthorized Incident',
          description: 'Testing protection',
          incident_type: 'flood',
          severity: 'high',
          location_name: 'Test',
          latitude: 12.8,
          longitude: 80.0
        });

      expect(res.status).toBe(401);
    });

    it('blocks viewer role from creating incidents with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Viewer Forbidden Incident',
          description: 'Should fail with 403',
          incident_type: 'flood',
          severity: 'high',
          location_name: 'Test',
          latitude: 12.8,
          longitude: 80.0
        });

      expect(res.status).toBe(403);
    });

    it('allows responder to create incident with 201 Created and broadcasts update', async () => {
      const createdRecord = {
        ...sampleIncident,
        id: 'new-incident-1234',
        title: 'Flash Flood Reported by Field Team'
      };

      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [createdRecord],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Authorization', `Bearer ${responderToken}`)
        .send({
          title: 'Flash Flood Reported by Field Team',
          description: 'Critical water level recorded at canal bridge.',
          incident_type: 'flood',
          severity: 'high',
          location_name: 'Kattankulathur Bridge',
          latitude: 12.823,
          longitude: 80.044,
          radius_km: 15.0
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.incident.id).toBe('new-incident-1234');
    });

    it('allows admin to update incident status to resolved', async () => {
      const resolvedIncident = {
        ...sampleIncident,
        status: 'resolved'
      };

      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [resolvedIncident],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .patch(`/api/v1/incidents/${sampleIncident.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.data.incident.status).toBe('resolved');
    });

    it('triggers a simulated drill event via /simulate', async () => {
      const simIncident = {
        ...sampleIncident,
        id: 'sim-drill-999',
        is_simulated: true,
        source: 'SIMULATED'
      };

      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [simIncident],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .post('/api/v1/incidents/simulate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: 12.8230,
          longitude: 80.0444,
          incident_type: 'flood',
          severity: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.incident.is_simulated).toBe(true);
    });

    it('rejects /simulate without Authorization header with 401', async () => {
      const res = await request(app)
        .post('/api/v1/incidents/simulate')
        .send({
          latitude: 12.8230,
          longitude: 80.0444,
          incident_type: 'flood',
          severity: 'high'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Missing or malformed Authorization header');
    });

    it('rejects /simulate with invalid or expired token with 401', async () => {
      const res = await request(app)
        .post('/api/v1/incidents/simulate')
        .set('Authorization', 'Bearer invalid.expired.token')
        .send({
          latitude: 12.8230,
          longitude: 80.0444,
          incident_type: 'flood',
          severity: 'high'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired authentication token');
    });

    it('rejects /simulate with viewer role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/incidents/simulate')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          latitude: 12.8230,
          longitude: 80.0444,
          incident_type: 'flood',
          severity: 'high'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('allows /simulate with responder role with 201 Created', async () => {
      const simIncident = {
        ...sampleIncident,
        id: 'sim-drill-responder-001',
        is_simulated: true,
        source: 'SIMULATED'
      };

      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [simIncident],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      const res = await request(app)
        .post('/api/v1/incidents/simulate')
        .set('Authorization', `Bearer ${responderToken}`)
        .send({
          latitude: 12.9249,
          longitude: 80.1000,
          incident_type: 'flood',
          severity: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.incident.is_simulated).toBe(true);
    });
  });

  describe('Provider Status (/api/v1/providers)', () => {
    it('lists registered disaster providers with health indicators', async () => {
      const res = await request(app).get('/api/v1/providers');
      expect(res.status).toBe(200);
      expect(res.body.data.providers.length).toBeGreaterThanOrEqual(3);
      const names = res.body.data.providers.map((p: { name: string }) => p.name);
      expect(names).toContain('SIMULATED_PROVIDER');
      expect(names).toContain('USGS_EARTHQUAKE_FEED');
      expect(names).toContain('OPEN_METEO_WEATHER_FEED');
    });
  });
});
