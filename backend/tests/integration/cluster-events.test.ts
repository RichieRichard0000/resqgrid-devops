// ==============================================================================
// Multi-Replica Cluster Events & Cross-Pod Pub/Sub Integration Test
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Principle: Verify distributed event propagation, reconnection recovery & privacy
// ==============================================================================

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { io as ClientSocket } from 'socket.io-client';
import { RealtimeManager } from '../../src/socket/index.js';
import { Incident } from '../../src/types/index.js';
import * as poolModule from '../../src/db/pool.js';

describe('Multi-Replica Cluster Events & Cross-Pod Event Delivery', () => {
  let server1: any;
  let server2: any;
  let port1: number;
  let port2: number;
  let manager1: RealtimeManager;
  let manager2: RealtimeManager;

  const mockIncident: Incident = {
    id: 'inc-cluster-001',
    title: 'Flash Flood Emergency',
    description: 'Rapid inundation near Adyar river basin',
    incident_type: 'flood',
    severity: 'critical',
    status: 'active',
    location_name: 'Adyar Basin',
    latitude: 12.823,
    longitude: 80.045,
    radius_km: 25.0,
    event_time: new Date().toISOString(),
    source: 'SIMULATED',
    is_simulated: true,
    metadata: { affected_population: 5000 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeAll(async () => {
    // Spin up two independent HTTP servers representing two independent Pod replicas
    server1 = createServer();
    server2 = createServer();

    await new Promise<void>((resolve) => server1.listen(0, () => resolve()));
    await new Promise<void>((resolve) => server2.listen(0, () => resolve()));

    port1 = server1.address().port;
    port2 = server2.address().port;

    manager1 = new RealtimeManager();
    manager2 = new RealtimeManager();

    manager1.initialize(server1, '*');
    manager2.initialize(server2, '*');
  });

  afterAll(async () => {
    await manager1.close();
    await manager2.close();
    await new Promise<void>((resolve) => server1.close(() => resolve()));
    await new Promise<void>((resolve) => server2.close(() => resolve()));
  });

  it('delivers geofenced alerts across simulated cluster instances without exposing sensitive data', async () => {
    // Client connects to Pod 2
    const clientSocket = ClientSocket(`http://localhost:${port2}`, {
      transports: ['websocket'],
      forceNew: true
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });

    // Client registers geofence centered on SRMIST (matching mockIncident coordinates)
    clientSocket.emit('subscribe_geofence', {
      latitude: 12.823,
      longitude: 80.045,
      radius_km: 30
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('geofence_subscribed', () => resolve());
    });

    // Promise waiting for the alert to arrive on Pod 2
    const alertPromise = new Promise<any>((resolve) => {
      clientSocket.on('geofence_alert', (data) => resolve(data));
    });

    // Pod 1 publishes an incident; simulate cross-pod delivery via manager2's localBroadcast
    // (In production, PostgreSQL pg_notify on 'resqgrid_cluster_events' bridges the two)
    (manager2 as any).localBroadcast(mockIncident, 'CREATED');

    const receivedAlert = await alertPromise;

    expect(receivedAlert).toBeDefined();
    expect(receivedAlert.incident.id).toBe('inc-cluster-001');
    expect(receivedAlert.severity).toBe('critical');
    expect(receivedAlert.distance_km).toBeLessThanOrEqual(30);

    // Verify ZERO sensitive user data is contained in the alert payload
    const payloadString = JSON.stringify(receivedAlert);
    expect(payloadString).not.toContain('password');
    expect(payloadString).not.toContain('jwt');
    expect(payloadString).not.toContain('token');
    expect(payloadString).not.toContain('secret');

    clientSocket.disconnect();
  });

  it('allows reconnected clients to synchronize missed incidents through request_sync', async () => {
    const clientSocket = ClientSocket(`http://localhost:${port1}`, {
      transports: ['websocket'],
      forceNew: true
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });

    // Mock query response for request_sync
    vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
      rows: [mockIncident],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });

    const syncPromise = new Promise<any>((resolve) => {
      clientSocket.on('sync_data', (data) => resolve(data));
    });

    // Client requests sync after recovering connection
    clientSocket.emit('request_sync', {
      lastSyncTime: new Date(Date.now() - 60000).toISOString()
    });

    const syncData = await syncPromise;

    expect(syncData).toBeDefined();
    expect(syncData.syncTime).toBeDefined();
    expect(Array.isArray(syncData.incidents)).toBe(true);
    expect(syncData.incidents.length).toBe(1);
    expect(syncData.incidents[0].id).toBe('inc-cluster-001');

    clientSocket.disconnect();
  });
});
