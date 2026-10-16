import { describe, it, expect } from 'vitest';
import {
  createIncidentSchema,
  updateStatusSchema,
  queryIncidentsSchema,
  loginSchema,
  registerSchema,
  geofenceLocationSchema
} from '../../src/config/schemas.js';

describe('Validation Schemas (Zod)', () => {
  describe('createIncidentSchema', () => {
    it('validates a correct incident creation payload', () => {
      const payload = {
        title: 'Flash Flood Warning',
        description: 'Severe waterlogging blocking traffic on main arterial highway.',
        incident_type: 'flood',
        severity: 'high',
        location_name: 'Tambaram Junction',
        latitude: 12.9249,
        longitude: 80.1000,
        radius_km: 20.0,
        source: 'MANUAL_DISPATCH',
        is_simulated: false
      };

      const result = createIncidentSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(payload.title);
        expect(result.data.status).toBe('active'); // default
      }
    });

    it('rejects payload with invalid latitude (exceeding +90)', () => {
      const payload = {
        title: 'Extreme Polar Event',
        description: 'Testing coordinate bounds.',
        incident_type: 'severe_weather',
        severity: 'medium',
        location_name: 'Beyond North Pole',
        latitude: 95.0, // Invalid: > 90
        longitude: 45.0
      };

      const result = createIncidentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('latitude'))).toBe(true);
      }
    });

    it('rejects payload with invalid longitude (exceeding -180)', () => {
      const payload = {
        title: 'Pacific Anomaly',
        description: 'Testing longitude bounds.',
        incident_type: 'earthquake',
        severity: 'low',
        location_name: 'Out of range',
        latitude: 10.0,
        longitude: -195.0 // Invalid: < -180
      };

      const result = createIncidentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('longitude'))).toBe(true);
      }
    });

    it('rejects invalid enum values for incident_type or severity', () => {
      const payload = {
        title: 'Invalid Disaster',
        description: 'Testing unknown disaster classification.',
        incident_type: 'alien_invasion', // Invalid
        severity: 'apocalyptic', // Invalid
        location_name: 'Unknown',
        latitude: 12.0,
        longitude: 80.0
      };

      const result = createIncidentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects payload when required fields (title, description, location_name) are missing', () => {
      const payload = {
        latitude: 12.0,
        longitude: 80.0
      };

      const result = createIncidentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((i) => i.path[0]);
        expect(errorPaths).toContain('title');
        expect(errorPaths).toContain('description');
        expect(errorPaths).toContain('incident_type');
        expect(errorPaths).toContain('severity');
      }
    });
  });

  describe('updateStatusSchema', () => {
    it('accepts valid statuses: active, investigating, resolved', () => {
      expect(updateStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
      expect(updateStatusSchema.safeParse({ status: 'investigating' }).success).toBe(true);
      expect(updateStatusSchema.safeParse({ status: 'resolved' }).success).toBe(true);
    });

    it('rejects unrecognized statuses', () => {
      expect(updateStatusSchema.safeParse({ status: 'closed_forever' }).success).toBe(false);
    });
  });

  describe('geofenceLocationSchema', () => {
    it('accepts valid GPS coordinates and radius', () => {
      const result = geofenceLocationSchema.safeParse({
        latitude: 12.823,
        longitude: 80.044,
        radius_km: 50
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative radius', () => {
      const result = geofenceLocationSchema.safeParse({
        latitude: 12.823,
        longitude: 80.044,
        radius_km: -10
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema and registerSchema', () => {
    it('validates correct email and minimum password length', () => {
      const result = loginSchema.safeParse({
        email: 'responder@resqgrid.local',
        password: 'Password123!'
      });
      expect(result.success).toBe(true);
    });

    it('rejects malformed email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123!'
      });
      expect(result.success).toBe(false);
    });

    it('rejects short passwords in registerSchema (< 8 characters)', () => {
      const result = registerSchema.safeParse({
        email: 'test@resqgrid.local',
        password: '123',
        full_name: 'Test Responder'
      });
      expect(result.success).toBe(false);
    });
  });
});
