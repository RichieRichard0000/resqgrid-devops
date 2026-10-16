-- Migration: 001_init_postgis.sql
-- Description: Enable PostgreSQL extensions required for ResQGrid (UUID generation & PostGIS spatial engine)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
