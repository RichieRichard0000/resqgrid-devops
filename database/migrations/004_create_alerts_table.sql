-- Migration: 004_create_alerts_table.sql
-- Description: Create alerts table for tracking real-time delivery and notification audit records

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL DEFAULT 'socket.io',
    client_socket_id VARCHAR(255),
    recipient_role VARCHAR(50) DEFAULT 'all',
    distance_km DOUBLE PRECISION,
    status VARCHAR(50) NOT NULL DEFAULT 'delivered',
    payload JSONB NOT NULL,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_delivered_at ON alerts(delivered_at DESC);
