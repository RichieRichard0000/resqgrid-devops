export type UserRole = 'admin' | 'responder' | 'viewer';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  [key: string]: any;
}

export type SafeUser = Omit<User, 'password_hash'>;

export type IncidentType = 'earthquake' | 'flood' | 'severe_weather' | 'emergency';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'active' | 'investigating' | 'resolved';

export type IncidentSource = 'USGS' | 'OPEN_METEO' | 'SIMULATED' | 'MANUAL_DISPATCH';

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
  event_time: Date | string;
  source: IncidentSource;
  is_simulated: boolean;
  external_id?: string | null;
  metadata: IncidentMetadata;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  distance_km?: number; // Present when spatial query includes distance calculation
  [key: string]: any;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status?: IncidentStatus;
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km?: number;
  event_time?: Date | string;
  source?: IncidentSource;
  is_simulated?: boolean;
  external_id?: string | null;
  metadata?: IncidentMetadata;
  created_by?: string | null;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  metadata?: IncidentMetadata;
}

export interface GeofenceSubscription {
  socketId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  userId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RealtimeIncidentEvent {
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'STATUS_CHANGED';
  incident: Incident;
  distance_km?: number;
  timestamp: string;
}
