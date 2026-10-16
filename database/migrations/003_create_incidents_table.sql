-- Migration: 003_create_incidents_table.sql
-- Description: Create incidents table with PostGIS geometry and spatial indexing

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('earthquake', 'flood', 'severe_weather', 'emergency')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved')),
    location_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    geom geometry(Point, 4326),
    radius_km DOUBLE PRECISION NOT NULL DEFAULT 25.0 CHECK (radius_km > 0),
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(100) NOT NULL DEFAULT 'MANUAL_DISPATCH',
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    external_id VARCHAR(255) UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically populate and sync PostGIS geometry column
CREATE OR REPLACE FUNCTION sync_incident_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_geom_sync ON incidents;
CREATE TRIGGER trg_incidents_geom_sync
BEFORE INSERT OR UPDATE OF latitude, longitude ON incidents
FOR EACH ROW
EXECUTE FUNCTION sync_incident_geom();

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_incidents_updated_at ON incidents;
CREATE TRIGGER trg_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Spatial GiST Index for efficient PostGIS geofencing and proximity queries
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST (geom);

-- Indexes for dashboard filtering and querying
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source);
CREATE INDEX IF NOT EXISTS idx_incidents_is_simulated ON incidents(is_simulated);
CREATE INDEX IF NOT EXISTS idx_incidents_event_time ON incidents(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_external_id ON incidents(external_id) WHERE external_id IS NOT NULL;
