import { Incident, IncidentStatus, User } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('resqgrid_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface IncidentFilterParams {
  page?: number;
  limit?: number;
  type?: string;
  severity?: string;
  status?: string;
  is_simulated?: boolean;
  search?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const api = {
  async getIncidents(params: IncidentFilterParams = {}): Promise<PaginatedResponse<Incident>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.type) query.append('type', params.type);
    if (params.severity) query.append('severity', params.severity);
    if (params.status) query.append('status', params.status);
    if (params.is_simulated !== undefined) query.append('is_simulated', String(params.is_simulated));
    if (params.search) query.append('search', params.search);
    if (params.lat !== undefined && params.lon !== undefined) {
      query.append('lat', params.lat.toString());
      query.append('lon', params.lon.toString());
      if (params.radius_km) query.append('radius_km', params.radius_km.toString());
    }

    const res = await fetch(`${API_BASE}/api/v1/incidents?${query.toString()}`, {
      headers: { ...getAuthHeader(), Accept: 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch incidents' }));
      throw new Error(err.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  },

  async getIncidentById(id: string): Promise<Incident> {
    const res = await fetch(`${API_BASE}/api/v1/incidents/${id}`, {
      headers: { ...getAuthHeader(), Accept: 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Incident not found`);
    }

    const json = await res.json();
    return json.data.incident;
  },

  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
    const res = await fetch(`${API_BASE}/api/v1/incidents/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        Accept: 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Update status failed' }));
      throw new Error(err.message || 'Failed to update status');
    }

    const json = await res.json();
    return json.data.incident;
  },

  async triggerSimulation(payload: {
    incident_type?: string;
    severity?: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    title?: string;
    location_name?: string;
  }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/api/v1/incidents/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Simulation trigger failed' }));
      throw new Error(err.message || 'Simulation trigger failed. Ensure you are signed in.');
    }

    const json = await res.json();
    return json.data.incident;
  },

  async createIncident(payload: Partial<Incident>): Promise<Incident> {
    const res = await fetch(`${API_BASE}/api/v1/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Creation failed' }));
      throw new Error(err.message || 'Creation failed');
    }

    const json = await res.json();
    return json.data.incident;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Invalid email or password');
    }

    const json = await res.json();
    localStorage.setItem('resqgrid_token', json.data.token);
    return json.data;
  },

  async checkHealth(): Promise<{ ready: boolean; latencyMs?: number }> {
    try {
      const res = await fetch(`${API_BASE}/health/ready`);
      const json = await res.json();
      return { ready: json.ready ?? false, latencyMs: json.database?.latencyMs };
    } catch {
      return { ready: false };
    }
  }
};
