import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { realtimeManager } from '../../src/socket/index.js';
import { Incident } from '../../src/types/index.js';
import * as poolModule from '../../src/db/pool.js';

describe('Real-Time Socket.IO & Geofence Alert Delivery', () => {
  let server: http.Server;
  let clientSocket: ClientSocketType;
  let port: number;

  beforeAll(async () => {
    // Mock DB queries for socket audit trails
    vi.spyOn(poolModule, 'query').mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: 'INSERT',
      oid: 0,
      fields: []
    });

    const app = createApp();
    server = http.createServer(app);
    realtimeManager.initialize(server, '*');

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address !== null) {
          port = address.port;
          resolve();
        }
      });
    });

    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true
      });
      clientSocket.on('connect', () => resolve());
    });
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('connects to real-time engine and responds to ping', async () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit('ping');
      clientSocket.once('pong', (data: { timestamp: number }) => {
        expect(data.timestamp).toBeDefined();
        resolve();
      });
    });
  });

  it('subscribes to geographic geofence alerts', async () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit('subscribe_geofence', {
        latitude: 12.823, // SRM Kattankulathur
        longitude: 80.044,
        radius_km: 25.0
      });

      clientSocket.once('geofence_subscribed', (ack: { status: string; radiusKm: number; latitude: number }) => {
        expect(ack.status).toBe('subscribed');
        expect(ack.radiusKm).toBe(25.0);
        expect(ack.latitude).toBe(12.823);
        resolve();
      });
    });
  });

  it('delivers geofence_alert when incident is INSIDE subscriber notification radius', async () => {
    return new Promise<void>((resolve) => {
      // Tambaram is ~13km from SRM, within the 25km radius
      const nearbyIncident: Incident = {
        id: 'nearby-incident-001',
        title: 'Flash Flood near Tambaram Station',
        description: 'Road inundated under 50cm water.',
        incident_type: 'flood',
        severity: 'high',
        status: 'active',
        location_name: 'Tambaram East',
        latitude: 12.9249,
        longitude: 80.1000,
        radius_km: 15.0,
        event_time: new Date().toISOString(),
        source: 'SIMULATED',
        is_simulated: true,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      clientSocket.once('geofence_alert', (alert: { incident: Incident; distance_km: number; message: string }) => {
        expect(alert.incident.id).toBe('nearby-incident-001');
        expect(alert.distance_km).toBeLessThanOrEqual(25.0);
        expect(alert.message).toContain('ALERT');
        resolve();
      });

      realtimeManager.broadcastIncident(nearbyIncident, 'CREATED');
    });
  });

  it('does NOT deliver geofence_alert when incident is OUTSIDE subscriber radius', async () => {
    return new Promise<void>((resolve) => {
      // New Delhi is ~1750km away, well outside the 25km radius
      const farIncident: Incident = {
        id: 'far-incident-002',
        title: 'Severe Smog Emergency in Delhi NCR',
        description: 'Air quality index above critical limits.',
        incident_type: 'emergency',
        severity: 'critical',
        status: 'active',
        location_name: 'Connaught Place, New Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        radius_km: 30.0,
        event_time: new Date().toISOString(),
        source: 'MANUAL_DISPATCH',
        is_simulated: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let receivedGeofenceAlert = false;
      const geofenceListener = () => {
        receivedGeofenceAlert = true;
      };
      clientSocket.on('geofence_alert', geofenceListener);

      // It SHOULD deliver general incident_event to all dashboards
      clientSocket.once('incident_event', (event: { incident: Incident }) => {
        expect(event.incident.id).toBe('far-incident-002');
        setTimeout(() => {
          clientSocket.off('geofence_alert', geofenceListener);
          expect(receivedGeofenceAlert).toBe(false);
          resolve();
        }, 150);
      });

      realtimeManager.broadcastIncident(farIncident, 'CREATED');
    });
  });

  it('unsubscribes from geographic geofence alerts when client clears location', async () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit('unsubscribe_geofence');

      clientSocket.once('geofence_unsubscribed', (ack: { status: string }) => {
        expect(ack.status).toBe('unsubscribed');

        // Now broadcast a nearby incident that would normally trigger an alert
        const nearbyIncident: Incident = {
          id: 'nearby-incident-after-unsub',
          title: 'Nearby Incident After Unsubscribe',
          description: 'Should not trigger geofence alert.',
          incident_type: 'flood',
          severity: 'high',
          status: 'active',
          location_name: 'Tambaram East',
          latitude: 12.9249,
          longitude: 80.1,
          radius_km: 15.0,
          event_time: new Date().toISOString(),
          source: 'SIMULATED',
          is_simulated: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let receivedAlert = false;
        const alertListener = () => {
          receivedAlert = true;
        };
        clientSocket.on('geofence_alert', alertListener);

        clientSocket.once('incident_event', () => {
          setTimeout(() => {
            clientSocket.off('geofence_alert', alertListener);
            expect(receivedAlert).toBe(false);
            resolve();
          }, 150);
        });

        realtimeManager.broadcastIncident(nearbyIncident, 'CREATED');
      });
    });
  });
});

