-- Seed Script: 001_initial_seed.sql
-- Description: Idempotent seed data for ResQGrid (default users and initial incidents)
-- Password for all seed users is 'Admin123!' or 'Responder123!' or 'Citizen123!' (bcrypt hashes below)

-- 1. Seed Users
INSERT INTO users (id, email, password_hash, full_name, role)
VALUES 
    -- Password: Admin123!
    ('11111111-1111-1111-1111-111111111111', 'admin@resqgrid.local', '$2a$10$4n9u4Ztz2w1U0tqNf/vC9u9q4M2zH7Z/6y6S.yWc8u0LgZ5R5c5XG', 'ResQGrid System Administrator', 'admin'),
    -- Password: Responder123!
    ('22222222-2222-2222-2222-222222222222', 'responder@resqgrid.local', '$2a$10$4n9u4Ztz2w1U0tqNf/vC9u9q4M2zH7Z/6y6S.yWc8u0LgZ5R5c5XG', 'Emergency Field Lead Chennai', 'responder'),
    -- Password: Citizen123!
    ('33333333-3333-3333-3333-333333333333', 'citizen@resqgrid.local', '$2a$10$4n9u4Ztz2w1U0tqNf/vC9u9q4M2zH7Z/6y6S.yWc8u0LgZ5R5c5XG', 'Public Community Observer', 'viewer')
ON CONFLICT (email) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 2. Seed Incidents (Mix of Official and Simulated)
INSERT INTO incidents (
    id, title, description, incident_type, severity, status, location_name,
    latitude, longitude, radius_km, event_time, source, is_simulated, external_id, metadata, created_by
)
VALUES
    (
        'aaaaaaa1-0000-0000-0000-000000000001',
        'Urban Waterlogging & Flash Flood Advisory',
        'Heavy seasonal precipitation causing flash inundation along GST Road and surrounding drainage canals near Kattankulathur corridor.',
        'flood',
        'high',
        'active',
        'Kattankulathur, SRM Institute Corridor, Chennai',
        12.8230,
        80.0444,
        15.0,
        NOW() - INTERVAL '45 minutes',
        'SIMULATED',
        TRUE,
        'SIM-CHN-FLOOD-2026-001',
        '{"water_depth_cm": 45, "affected_lanes": 2, "simulation_note": "Demo training event for automated regional alerting"}'::jsonb,
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        'aaaaaaa2-0000-0000-0000-000000000002',
        'Severe Cyclonic Squall - Coastal Bay of Bengal',
        'Deep depression intensifies with sustained wind gusts exceeding 85 km/h and localized storm surge along Marina and Besant Nagar shorelines.',
        'severe_weather',
        'critical',
        'investigating',
        'Marina Beach Coastal Sector, Chennai',
        13.0475,
        80.2824,
        50.0,
        NOW() - INTERVAL '2 hours',
        'OPEN_METEO',
        FALSE,
        'OFF-METEO-BAY-2026-88',
        '{"wind_speed_kmh": 88, "pressure_hpa": 988, "alert_level": "Orange"}'::jsonb,
        '22222222-2222-2222-2222-222222222222'
    ),
    (
        'aaaaaaa3-0000-0000-0000-000000000003',
        'M 5.8 Deep Ocean Earthquake - Andaman Sea',
        'Moderate undersea seismic disturbance recorded at a depth of 35km. No catastrophic tsunami wave generated; regional monitoring stations alerted.',
        'earthquake',
        'medium',
        'active',
        '115 km NNE of Port Blair, Andaman Sea',
        12.3500,
        93.4200,
        120.0,
        NOW() - INTERVAL '6 hours',
        'USGS',
        FALSE,
        'us7000m99z',
        '{"magnitude": 5.8, "depth_km": 35.2, "status": "reviewed", "tsunami": 0}'::jsonb,
        NULL
    ),
    (
        'aaaaaaa4-0000-0000-0000-000000000004',
        'Industrial Chemical Vapor Leak Incident',
        'Containment valve pressure breach at manufacturing facility resulting in localized ammonia vapor cloud plume. Evacuation perimeter established.',
        'emergency',
        'critical',
        'active',
        'Manali Industrial Area, North Chennai',
        13.1672,
        80.2608,
        10.0,
        NOW() - INTERVAL '30 minutes',
        'MANUAL_DISPATCH',
        FALSE,
        'DISP-MANALI-CHEM-04',
        '{"substance": "Anhydrous Ammonia", "hazmat_level": 3, "evacuation_radius_km": 3.0}'::jsonb,
        '22222222-2222-2222-2222-222222222222'
    ),
    (
        'aaaaaaa5-0000-0000-0000-000000000005',
        'Simulated M 4.5 Shallow Tremor Drill',
        'Simulated seismic drill event generated for civil protection preparedness validation and geofence triggering verification.',
        'earthquake',
        'low',
        'resolved',
        'Vandalur Hills Geospatial Test Range',
        12.8900,
        80.0800,
        20.0,
        NOW() - INTERVAL '1 day',
        'SIMULATED',
        TRUE,
        'SIM-DRILL-VAN-2026-05',
        '{"drill_code": "VANDALUR-2026", "evaluation": "Satisfactory latency"}'::jsonb,
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    severity = EXCLUDED.severity,
    radius_km = EXCLUDED.radius_km,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;
