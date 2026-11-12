// ==============================================================================
// Live Cross-Process PostgreSQL LISTEN/NOTIFY Integration Test
// Project: ResQGrid — Real-Time Disaster Alert & Response Platform
// Principle: Proves inter-process event propagation between two separate Node PIDs
// ==============================================================================

import { spawn } from 'child_process';
import { io as ClientSocket } from 'socket.io-client';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const DB_URL = process.env.DATABASE_URL || 'postgresql://resqgrid_user:resqgrid_password@localhost:5433/resqgrid';

console.log('========================================================================');
console.log(' PostgreSQL LISTEN/NOTIFY Live Cross-Process Verification');
console.log(' Target Database:', DB_URL);
console.log('========================================================================');

// Helper to spawn a backend replica worker process
function spawnReplica(name, port) {
  const code = `
    import http from 'http';
    import { RealtimeManager } from './backend/dist/socket/index.js';
    import { pool } from './backend/dist/db/pool.js';

    process.env.DATABASE_URL = '${DB_URL}';
    process.env.NODE_ENV = 'production';
    process.env.POD_NAME = '${name}';

    const server = http.createServer((req, res) => {
      if (req.url === '/broadcast' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            await manager.broadcastIncident(data.incident, data.action || 'CREATED');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'broadcasted', origin: '${name}', pid: process.pid }));
          } catch (e) {
            res.writeHead(500);
            res.end(e.message);
          }
        });
      } else {
        res.writeHead(200);
        res.end('OK');
      }
    });

    const manager = new RealtimeManager();
    manager.initialize(server, '*');

    server.listen(${port}, () => {
      console.log('READY:${name}:' + process.pid + ':${port}');
    });

    process.on('SIGTERM', async () => {
      await manager.close();
      server.close();
      process.exit(0);
    });
  `;

  return spawn('node', ['--input-type=module', '-e', code], {
    cwd: rootDir,
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env, DATABASE_URL: DB_URL }
  });
}

async function run() {
  console.log('[1/4] Spawning Process A (Port 4001) and Process B (Port 4002)...');
  const procA = spawnReplica('replica-pod-alpha', 4001);
  const procB = spawnReplica('replica-pod-beta', 4002);

  let pidA, pidB;

  const waitReady = (proc, name) => new Promise((resolve) => {
    proc.stdout.on('data', (d) => {
      const line = d.toString();
      if (line.includes(`READY:${name}`)) {
        const parts = line.trim().split(':');
        resolve(parseInt(parts[2], 10));
      }
    });
  });

  [pidA, pidB] = await Promise.all([
    waitReady(procA, 'replica-pod-alpha'),
    waitReady(procB, 'replica-pod-beta')
  ]);

  console.log(`  -> Process A spawned: PID ${pidA} (Listening on port 4001)`);
  console.log(`  -> Process B spawned: PID ${pidB} (Listening on port 4002)`);

  if (pidA === pidB) {
    throw new Error('Processes must have different PIDs!');
  }

  // Give 1 second for PostgreSQL LISTEN clients to register
  await new Promise(r => setTimeout(r, 1000));

  console.log('[2/4] Connecting WebSocket Client to Process B (PID ' + pidB + ')...');
  const clientSocket = ClientSocket('http://localhost:4002', {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise(resolve => clientSocket.on('connect', resolve));
  console.log('  -> Client connected with socket ID:', clientSocket.id);

  console.log('[3/4] Registering geofence perimeter on Process B for SRMIST Kattankulathur...');
  clientSocket.emit('subscribe_geofence', {
    latitude: 12.823,
    longitude: 80.045,
    radius_km: 30
  });

  await new Promise(resolve => clientSocket.on('geofence_subscribed', resolve));
  console.log('  -> Geofence subscription confirmed by Process B');

  // Setup promise to capture the cross-process alert
  const alertReceivedPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for cross-process alert!')), 8000);
    clientSocket.on('geofence_alert', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });

  console.log('[4/4] Triggering incident publication on Process A (PID ' + pidA + ')...');
  const testIncident = {
    id: 'inc-cross-proc-' + Date.now(),
    title: 'Flash Flood Warning - Adyar Basin',
    description: 'Rapid water accumulation monitored near river banks',
    incident_type: 'flood',
    severity: 'critical',
    status: 'active',
    location_name: 'Adyar Basin, Chennai',
    latitude: 12.825,
    longitude: 80.048,
    radius_km: 25.0,
    event_time: new Date().toISOString(),
    source: 'SIMULATED',
    is_simulated: true,
    metadata: { test_run: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // HTTP POST to Process A's broadcast endpoint
  await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4001,
      path: '/broadcast',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ incident: testIncident, action: 'CREATED' }));
    req.end();
  });

  console.log('  -> Process A published incident and executed: SELECT pg_notify(\'resqgrid_cluster_events\')');

  const alert = await alertReceivedPromise;
  console.log('========================================================================');
  console.log(' CROSS-PROCESS VERIFICATION SUCCESSFUL!');
  console.log('========================================================================');
  console.log(' Publisher Process:        Process A (PID ' + pidA + ', Port 4001)');
  console.log(' PostgreSQL Bus:           resqgrid_db:5433 (Channel: resqgrid_cluster_events)');
  console.log(' Consumer Process:         Process B (PID ' + pidB + ', Port 4002)');
  console.log(' Client Connected to:      Process B');
  console.log(' Received Alert ID:        ' + alert.incident.id);
  console.log(' Incident Title:           ' + alert.incident.title);
  console.log(' Distance to User:         ' + alert.distance_km + ' km');
  console.log(' Severity Level:           ' + alert.severity);
  console.log(' Delivery Status:          PROVED ACROSS TWO SEPARATE OS PROCESSES');
  console.log('========================================================================');

  clientSocket.disconnect();
  procA.kill('SIGTERM');
  procB.kill('SIGTERM');
  process.exit(0);
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
