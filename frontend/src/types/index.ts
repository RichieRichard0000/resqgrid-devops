export type IncidentType = 'earthquake' | 'flood' | 'severe_weather' | 'emergency';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'active' | 'investigating' | 'resolved';
export type IncidentSource = 'USGS' | 'OPEN_METEO' | 'SIMULATED' | 'MANUAL_DISPATCH';
export type UserRole = 'admin' | 'responder' | 'viewer';

export interface IncidentMetadata {
  magnitude?: number;
  depth_km?: number;
  wind_speed_kmh?: number;
  water_depth_cm?: number;
  hazmat_level?: number;
  tsunami?: number;
  alert_level?: string;
  simulation_note?: string;
  [key: string]: unknown;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  event_time: string;
  source: IncidentSource;
  is_simulated: boolean;
  external_id?: string | null;
  metadata: IncidentMetadata;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface GeofenceAlert {
  incident: Incident;
  distance_km: number;
  user_radius_km: number;
  is_simulated: boolean;
  severity: IncidentSeverity;
  message: string;
  timestamp: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  radiusKm: number;
}
