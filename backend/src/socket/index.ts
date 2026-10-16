import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Incident, RealtimeIncidentEvent } from '../types/index.js';
import { calculateDistanceKm, isWithinRadius } from '../utils/geo.js';
import { logger } from '../utils/logger.js';
import { activeSocketConnections, alertsBroadcastTotal } from '../metrics/index.js';
import { geofenceLocationSchema } from '../config/schemas.js';
import { query } from '../db/pool.js';

interface ClientSessionData {
  location?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  connectedAt: Date;
}

export class RealtimeManager {
  private io: Server | null = null;
  private clientSessions = new Map<string, ClientSessionData>();

  initialize(httpServer: HttpServer, corsOrigin: string): Server {
    const origins = corsOrigin.split(',').map((o) => o.trim());

    this.io = new Server(httpServer, {
      cors: {
        origin: origins.length === 1 ? origins[0] : origins,
        methods: ['GET', 'POST', 'PATCH'],
        credentials: true
      },
      pingTimeout: 20000,
      pingInterval: 10000
    });

    this.io.on('connection', (socket: Socket) => {
      activeSocketConnections.inc();
      this.clientSessions.set(socket.id, {
        connectedAt: new Date()
      });

      logger.info({ socketId: socket.id }, 'Real-time client connected');

      // 1. Subscribe client to geographic alerts
      socket.on('subscribe_geofence', (data: unknown) => {
        try {
          const parsed = geofenceLocationSchema.parse(data);
          const session = this.clientSessions.get(socket.id) || { connectedAt: new Date() };
          session.location = {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            radiusKm: parsed.radius_km
          };
          this.clientSessions.set(socket.id, session);

          socket.emit('geofence_subscribed', {
            status: 'subscribed',
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            radiusKm: parsed.radius_km,
            message: `Subscribed to real-time disaster alerts within ${parsed.radius_km} km radius.`
          });

          logger.info(
            { socketId: socket.id, lat: parsed.latitude, lon: parsed.longitude, radiusKm: parsed.radius_km },
            'Client registered geographic geofence'
          );
        } catch (err: unknown) {
          socket.emit('error', {
            code: 'INVALID_GEOFENCE_DATA',
            message: err instanceof Error ? err.message : 'Invalid geofence coordinates or radius'
          });
        }
      });

      // 2. Client asks for synchronization after reconnecting
      socket.on('request_sync', async (data: { lastSyncTime?: string }) => {
        try {
          const since = data?.lastSyncTime ? new Date(data.lastSyncTime) : new Date(Date.now() - 3600000);
          const res = await query<Incident>(
            `SELECT id, title, description, incident_type, severity, status, location_name,
                    latitude, longitude, radius_km, event_time, source, is_simulated,
                    external_id, metadata, created_by, created_at, updated_at
             FROM incidents
             WHERE updated_at >= $1
             ORDER BY event_time DESC
             LIMIT 50`,
            [since]
          );

          socket.emit('sync_data', {
            syncTime: new Date().toISOString(),
            incidents: res.rows
          });
          logger.info({ socketId: socket.id, count: res.rows.length }, 'Dispatched reconnection sync data');
        } catch (err) {
          logger.error({ socketId: socket.id, err }, 'Failed to process sync request');
        }
      });

      // 3. Heartbeat / ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // 4. Handle disconnect
      socket.on('disconnect', (reason) => {
        activeSocketConnections.dec();
        this.clientSessions.delete(socket.id);
        logger.info({ socketId: socket.id, reason }, 'Real-time client disconnected');
      });
    });

    return this.io;
  }

  getIo(): Server | null {
    return this.io;
  }

  /**
   * Dispatches a real-time event for an incident to connected clients
   */
  async broadcastIncident(incident: Incident, action: RealtimeIncidentEvent['action']): Promise<void> {
    if (!this.io) {
      logger.warn('Socket.IO server not initialized; skipping live broadcast');
      return;
    }

    const payload: RealtimeIncidentEvent = {
      action,
      incident,
      timestamp: new Date().toISOString()
    };

    // 1. Broadcast global feed update to all connected clients (for dashboard live view)
    this.io.emit('incident_event', payload);

    // 2. Perform server-side spatial filtering for targeted geofence alerts
    for (const [socketId, session] of this.clientSessions.entries()) {
      if (!session.location) continue;

      const userLat = session.location.latitude;
      const userLon = session.location.longitude;
      const userRadius = session.location.radiusKm;

      const distanceKm = calculateDistanceKm(userLat, userLon, incident.latitude, incident.longitude);

      // Check if incident is within the user's chosen notification radius
      const isRelevant = distanceKm <= userRadius;

      if (isRelevant) {
        this.io.to(socketId).emit('geofence_alert', {
          incident,
          distance_km: distanceKm,
          user_radius_km: userRadius,
          is_simulated: incident.is_simulated,
          severity: incident.severity,
          message: `ALERT: ${incident.severity.toUpperCase()} ${incident.incident_type} detected ${distanceKm.toFixed(1)} km from your location!`,
          timestamp: new Date().toISOString()
        });

        alertsBroadcastTotal.inc({ channel: 'socket.io', severity: incident.severity });

        // Record alert audit trail asynchronously
        this.logAlertAudit(incident.id, socketId, distanceKm, incident).catch((err) => {
          logger.warn({ err }, 'Failed to record alert audit record');
        });
      }
    }

    logger.info({ incidentId: incident.id, action }, 'Broadcasted real-time incident event');
  }

  private async logAlertAudit(
    incidentId: string,
    socketId: string,
    distanceKm: number,
    incident: Incident
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO alerts (incident_id, client_socket_id, distance_km, channel, payload)
         VALUES ($1, $2, $3, 'socket.io', $4)`,
        [
          incidentId,
          socketId,
          distanceKm,
          JSON.stringify({
            title: incident.title,
            severity: incident.severity,
            incident_type: incident.incident_type,
            is_simulated: incident.is_simulated
          })
        ]
      );
    } catch {
      // Ignore non-critical audit error in case DB is in mock mode or alerts table unavailable
    }
  }
}

export const realtimeManager = new RealtimeManager();
export default realtimeManager;
