# ResQGrid API Reference (Phase 1)

Base URL: `http://localhost:4000` (or `/api/v1` via Nginx on `http://localhost:3000`)

---

## 1. Authentication & Authorization

Protected endpoints require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

### Pre-configured Seed Roles:
| Email | Password | Role | Description |
|---|---|---|---|
| `admin@resqgrid.local` | `Admin123!` | `admin` | Full control, simulation trigger, provider ingestion |
| `responder@resqgrid.local` | `Responder123!` | `responder` | Create incidents, update incident statuses |
| `citizen@resqgrid.local` | `Citizen123!` | `viewer` | Read-only observation, personal geofence alerts |

---

## 2. Observability Endpoints

### `GET /health/live`
Process liveness check.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "uptimeSeconds": 1420,
  "timestamp": "2026-10-17T01:00:00.000Z"
}
```

### `GET /health/ready`
Database connectivity and application readiness check.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "ready": true,
  "database": {
    "isHealthy": true,
    "latencyMs": 1.45
  },
  "timestamp": "2026-10-17T01:00:00.000Z"
}
```
- **Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "ready": false,
  "database": {
    "isHealthy": false,
    "latencyMs": 5002,
    "error": "Connection timeout"
  },
  "timestamp": "2026-10-17T01:00:00.000Z"
}
```

### `GET /metrics`
Prometheus metrics format scraped by Prometheus collector.
- **Response (200 OK):**
```text
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05",method="GET",route="/api/v1/incidents",status_code="200",app="resqgrid-backend"} 12
...
# HELP active_socket_connections Number of currently active real-time client WebSocket connections
# TYPE active_socket_connections gauge
active_socket_connections{app="resqgrid-backend"} 3
```

---

## 3. Authentication Endpoints

### `POST /api/v1/auth/login`
- **Request Body:**
```json
{
  "email": "admin@resqgrid.local",
  "password": "Admin123!"
}
```
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "email": "admin@resqgrid.local",
      "full_name": "ResQGrid System Administrator",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-10-17T00:00:00.000Z",
      "updated_at": "2026-10-17T00:00:00.000Z"
    }
  }
}
```

### `GET /api/v1/auth/me`
*Requires Bearer Token.* Returns profile of authenticated user.

---

## 4. Incident Management Endpoints

### `GET /api/v1/incidents`
Retrieve paginated list of disaster incidents with optional spatial radius matching.

**Query Parameters:**
- `page` (default 1)
- `limit` (default 20, max 100)
- `type` (`flood`, `earthquake`, `severe_weather`, `emergency`)
- `severity` (`low`, `medium`, `high`, `critical`)
- `status` (`active`, `investigating`, `resolved`)
- `is_simulated` (`true`, `false`)
- `search` (keyword search on title/description/location)
- `lat` (Latitude for PostGIS radius matching)
- `lon` (Longitude for PostGIS radius matching)
- `radius_km` (Geographic search boundary in km)

- **Example Spatial Query:**
```http
GET /api/v1/incidents?lat=12.8230&lon=80.0444&radius_km=50&severity=high
```

- **Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "aaaaaaa1-0000-0000-0000-000000000001",
      "title": "Urban Waterlogging & Flash Flood Advisory",
      "description": "Heavy seasonal precipitation causing flash inundation along GST Road.",
      "incident_type": "flood",
      "severity": "high",
      "status": "active",
      "location_name": "Kattankulathur, SRM Institute Corridor, Chennai",
      "latitude": 12.823,
      "longitude": 80.0444,
      "radius_km": 15,
      "event_time": "2026-10-17T00:15:00.000Z",
      "source": "SIMULATED",
      "is_simulated": true,
      "external_id": "SIM-CHN-FLOOD-2026-001",
      "metadata": { "affected_lanes": 2 },
      "distance_km": 0.05
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### `GET /api/v1/incidents/:id`
Retrieve incident details by UUID. Returns `404 Not Found` if missing.

### `POST /api/v1/incidents`
*Requires `admin` or `responder` role.* Creates a new incident and broadcasts live event to Socket.IO clients.

- **Request Body:**
```json
{
  "title": "Flash Flood Inundation at Railway Underpass",
  "description": "Rising floodwaters exceeding 1 meter, rescue teams deployed.",
  "incident_type": "flood",
  "severity": "high",
  "location_name": "Tambaram Railway Substation",
  "latitude": 12.9249,
  "longitude": 80.1000,
  "radius_km": 20.0,
  "source": "MANUAL_DISPATCH"
}
```

### `PATCH /api/v1/incidents/:id/status`
*Requires `admin` or `responder` role.* Updates incident status (`active`, `investigating`, `resolved`) and broadcasts state change to clients.

- **Request Body:**
```json
{
  "status": "resolved"
}
```

### `POST /api/v1/incidents/simulate`
*Requires `admin` or `responder` role.* Dispatches a synthetic emergency drill near specified or default coordinates (Chennai / SRM campus) to test live geofencing alerting.

- **Request Body:**
```json
{
  "incident_type": "flood",
  "severity": "high",
  "latitude": 12.8230,
  "longitude": 80.0444,
  "radius_km": 25.0,
  "title": "[SIMULATION] Campus Inundation Response Drill",
  "location_name": "SRM Kattankulathur Campus Sector"
}
```

### `POST /api/v1/incidents/ingest`
*Requires `admin` or `responder` role.* Manually triggers upstream provider ingestion (USGS earthquake feed, Open-Meteo, etc.).

---

## 5. Socket.IO Real-Time Protocol

WebSocket endpoint: `ws://localhost:4000/socket.io/?transport=websocket`

### Client -> Server Events:
1. `subscribe_geofence`:
```json
{
  "latitude": 12.8230,
  "longitude": 80.0444,
  "radius_km": 50.0
}
```
2. `request_sync`:
```json
{
  "lastSyncTime": "2026-10-17T00:30:00.000Z"
}
```
3. `ping` -> triggers `pong`

### Server -> Client Events:
1. `geofence_alert`: Sent to clients whose registered location falls within the incident notification radius.
```json
{
  "incident": { "...incident object..." },
  "distance_km": 12.8,
  "user_radius_km": 50.0,
  "severity": "high",
  "is_simulated": true,
  "message": "ALERT: HIGH flood detected 12.8 km from your location!",
  "timestamp": "2026-10-17T01:00:00.000Z"
}
```
2. `incident_event`: Sent to all connected clients when an incident is created or updated for live dashboard state refresh.
```json
{
  "action": "CREATED",
  "incident": { "...incident object..." },
  "timestamp": "2026-10-17T01:00:00.000Z"
}
```
