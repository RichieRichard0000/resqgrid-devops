# ResQGrid — Architecture & Data Flow (Phase 1)

## 1. System Overview

**ResQGrid** is a real-time disaster alert and response platform engineered for civil protection authorities, emergency responders, and communities. It serves as the functional foundation for a final-year Computer Science & Engineering project at SRM Institute of Science and Technology.

The platform couples spatial computation (PostgreSQL with PostGIS) and sub-second bi-directional WebSocket communication (Socket.IO) to deliver targeted, geofenced alerts without exposing user location data or broadcasting irrelevant alerts to remote clients.

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Browser)"]
        UI["React 18 + Vite + Tailwind CSS"]
        Leaflet["Leaflet + OpenStreetMap"]
        GeoHook["useGeolocation (GPS)"]
        SocketHook["useSocket (Socket.IO Client)"]
        UI --> Leaflet
        UI --> GeoHook
        UI --> SocketHook
    end

    subgraph Gateway ["Reverse Proxy Tier"]
        Nginx["Nginx Reverse Proxy (:80)"]
    end

    subgraph AppTier ["Application Tier (Node.js & Express :4000)"]
        Server["HTTP & Socket.IO Engine"]
        Router["Express REST Router (/api/v1)"]
        AuthMid["JWT & RBAC Middleware"]
        RealtimeMgr["Realtime Manager (Spatial Geofence Filter)"]
        ProvMgr["Disaster Provider Registry"]
        MetricsModule["Prometheus Instrumentation (/metrics)"]

        Server --> Router
        Server --> RealtimeMgr
        Server --> MetricsModule
        Router --> AuthMid
        Router --> ProvMgr
    end

    subgraph Ingestion ["Disaster Event Providers"]
        SimProvider["Simulated Provider (Offline Reliable)"]
        USGSProvider["USGS Earthquake Adapter (GeoJSON REST)"]
        WeatherProvider["Open-Meteo Weather Adapter (REST)"]
        ProvMgr --> SimProvider
        ProvMgr --> USGSProvider
        ProvMgr --> WeatherProvider
    end

    subgraph DataTier ["Data Tier (PostgreSQL 16 + PostGIS 3.4)"]
        PGPool["pg Connection Pool"]
        PostGIS["PostGIS Spatial GiST Index (WGS 84 / SRID 4326)"]
        Tables["Tables: users, incidents, alerts, schema_migrations"]
        PGPool --> PostGIS
        PostGIS --> Tables
    end

    Client -- HTTP Requests --> Nginx
    Client -- WebSocket Upgrade --> Nginx
    Nginx --> Server
    Router --> PGPool
    RealtimeMgr --> PGPool
```

---

## 2. Geofence Alerting Data Flow

The geofence alerting system ensures that connected clients only receive high-priority alerts relevant to their configured geographic notification radius.

```mermaid
sequenceDiagram
    autonumber
    actor User as Citizen / Responder
    participant UI as ResQGrid Dashboard
    participant Socket as Socket.IO Server
    participant PostGIS as PostgreSQL + PostGIS
    participant Provider as Disaster Provider / Admin

    User->>UI: Click "Enable My Location"
    UI->>User: Browser prompts for GPS permissions
    User-->>UI: Permission Granted (Lat, Lon, Radius)
    UI->>Socket: emit('subscribe_geofence', { lat, lon, radius_km })
    Socket-->>UI: emit('geofence_subscribed', { status: 'subscribed' })

    Note over Provider,Socket: Disaster occurs or drill dispatched
    Provider->>Socket: broadcastIncident(incident, 'CREATED')

    loop For each connected client session
        Socket->>Socket: calculateDistanceKm(userCoords, incidentCoords)
        alt Distance <= Client Notification Radius
            Socket-->>UI: emit('geofence_alert', { incident, distance_km, severity })
            UI-->>User: Render Critical Siren Banner & Pulsing Map Marker
            Socket->>PostGIS: INSERT INTO alerts (audit record)
        else Distance > Client Radius
            Socket-->>UI: emit('incident_event', { action: 'CREATED', incident })
            Note over UI: Updated in general feed without emergency sirens
        end
    end
```

---

## 3. Database Entity-Relationship Diagram

The relational model tracks users with Role-Based Access Control (`admin`, `responder`, `viewer`), disaster incidents with native PostGIS spatial points and GiST indexing, and alert audit records.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar role "admin | responder | viewer"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    INCIDENTS {
        uuid id PK
        varchar title
        text description
        varchar incident_type "earthquake | flood | severe_weather | emergency"
        varchar severity "low | medium | high | critical"
        varchar status "active | investigating | resolved"
        varchar location_name
        float8 latitude
        float8 longitude
        geometry geom "Point (SRID 4326)"
        float8 radius_km
        timestamptz event_time
        varchar source "USGS | OPEN_METEO | SIMULATED | MANUAL_DISPATCH"
        boolean is_simulated
        varchar external_id UK
        jsonb metadata
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    ALERTS {
        uuid id PK
        uuid incident_id FK
        varchar channel "socket.io"
        varchar client_socket_id
        varchar recipient_role
        float8 distance_km
        varchar status
        jsonb payload
        timestamptz delivered_at
    }

    SCHEMA_MIGRATIONS {
        serial id PK
        varchar version UK
        timestamptz applied_at
    }

    USERS ||--o{ INCIDENTS : "created_by"
    INCIDENTS ||--o{ ALERTS : "delivers"
```

---

## 4. Key Architectural Decisions

### 4.1 PostGIS Spatial Querying
- PostGIS `geography` type on the WGS 84 ellipsoid (SRID 4326) computes distances natively in meters using `ST_DWithin` and `ST_Distance`.
- A GiST index (`CREATE INDEX idx_incidents_geom ON incidents USING GIST (geom);`) ensures sub-millisecond execution times even with millions of records.
- In-memory Haversine formula is used as a complementary validation layer and fast path in WebSocket connection handlers.

### 4.2 Separation of Concerns & Provider Abstraction
- The `DisasterEventProvider` interface defines a clean contract (`fetchEvents()`, `healthCheck()`, `isSimulated`).
- External APIs (USGS, Open-Meteo) have independent timeouts (`AbortController`) and graceful degradation: if an external API fails or times out, the platform logs a warning, increments an error metric, and continues normal operation.
- Simulated events are strictly flagged (`is_simulated = true`) to prevent mistaking drills for official civil emergencies.

### 4.3 Blue-Green Deployment & Migration Compatibility
- Schema migrations use explicit forward-compatible DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, triggers).
- Version tracking is recorded in `schema_migrations`.
- Seeds use `ON CONFLICT DO UPDATE` to guarantee repeatable, idempotent application.

### 4.4 Observability & Monitoring Foundations
- Liveness (`/health/live`) and readiness (`/health/ready`) endpoints provide clean Kubernetes / Docker orchestration hooks.
- Prometheus metrics (`/metrics`) track request counts, latencies (histogram), active socket connections, and ingestion counts without high-cardinality labels.
