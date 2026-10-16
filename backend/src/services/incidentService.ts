import { query } from '../db/pool.js';
import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentStatus,
  PaginatedResult
} from '../types/index.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
import { disasterEventsIngestedTotal } from '../metrics/index.js';
import { calculateDistanceKm } from '../utils/geo.js';

export interface IncidentFilterOptions {
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

export class IncidentService {
  /**
   * Query incidents with filtering, pagination, and optional PostGIS spatial radius matching
   */
  async listIncidents(filters: IncidentFilterOptions): Promise<PaginatedResult<Incident>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // PostGIS distance calculation if coordinates provided
    let selectClause = `
      id, title, description, incident_type, severity, status, location_name,
      latitude, longitude, radius_km, event_time, source, is_simulated,
      external_id, metadata, created_by, created_at, updated_at
    `;

    if (filters.lat !== undefined && filters.lon !== undefined) {
      values.push(filters.lon, filters.lat);
      const lonIdx = paramIndex++;
      const latIdx = paramIndex++;

      // ST_Distance in geography calculates meters on WGS 84 ellipsoid -> convert to km
      selectClause += `,
        ROUND((ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($${lonIdx}, $${latIdx}), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
      `;

      if (filters.radius_km) {
        values.push(filters.radius_km * 1000); // meters
        const radIdx = paramIndex++;
        conditions.push(
          `ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($${lonIdx}, $${latIdx}), 4326)::geography, $${radIdx})`
        );
      }
    }

    if (filters.type) {
      values.push(filters.type);
      conditions.push(`incident_type = $${paramIndex++}`);
    }

    if (filters.severity) {
      values.push(filters.severity);
      conditions.push(`severity = $${paramIndex++}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${paramIndex++}`);
    }

    if (filters.is_simulated !== undefined) {
      values.push(filters.is_simulated);
      conditions.push(`is_simulated = $${paramIndex++}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      const sIdx = paramIndex++;
      conditions.push(`(title ILIKE $${sIdx} OR description ILIKE $${sIdx} OR location_name ILIKE $${sIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching records
    const countSql = `SELECT COUNT(*) AS total FROM incidents ${whereClause}`;
    const countRes = await query<{ total: string }>(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Sorting: if geo query, sort by distance; otherwise sort by event_time desc
    const orderClause =
      filters.lat !== undefined && filters.lon !== undefined
        ? 'ORDER BY distance_km ASC, event_time DESC'
        : 'ORDER BY event_time DESC';

    const dataSql = `
      SELECT ${selectClause}
      FROM incidents
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataValues = [...values, limit, offset];
    const dataRes = await query<Incident>(dataSql, dataValues);

    const rows = dataRes.rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      radius_km: Number(row.radius_km),
      distance_km: row.distance_km !== undefined ? Number(row.distance_km) : undefined
    }));

    return {
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Retrieve a single incident by ID
   */
  async getIncidentById(id: string): Promise<Incident> {
    const res = await query<Incident>(
      `SELECT id, title, description, incident_type, severity, status, location_name,
              latitude, longitude, radius_km, event_time, source, is_simulated,
              external_id, metadata, created_by, created_at, updated_at
       FROM incidents WHERE id = $1`,
      [id]
    );

    const incident = res.rows[0];
    if (!incident) {
      throw new NotFoundError(`Incident with ID '${id}' not found`);
    }

    return {
      ...incident,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      radius_km: Number(incident.radius_km)
    };
  }

  /**
   * Create a new disaster incident
   */
  async createIncident(input: CreateIncidentInput, creatorUserId?: string): Promise<Incident> {
    const eventTime = input.event_time ? new Date(input.event_time) : new Date();
    const source = input.source || 'MANUAL_DISPATCH';
    const isSimulated = input.is_simulated ?? (source === 'SIMULATED');
    const radiusKm = input.radius_km || 25.0;
    const metadata = input.metadata || {};

    const sql = `
      INSERT INTO incidents (
        title, description, incident_type, severity, status, location_name,
        latitude, longitude, radius_km, event_time, source, is_simulated,
        external_id, metadata, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, title, description, incident_type, severity, status, location_name,
                latitude, longitude, radius_km, event_time, source, is_simulated,
                external_id, metadata, created_by, created_at, updated_at
    `;

    const values = [
      input.title,
      input.description,
      input.incident_type,
      input.severity,
      input.status || 'active',
      input.location_name,
      input.latitude,
      input.longitude,
      radiusKm,
      eventTime,
      source,
      isSimulated,
      input.external_id || null,
      JSON.stringify(metadata),
      creatorUserId || null
    ];

    try {
      const res = await query<Incident>(sql, values);
      const created = res.rows[0];

      disasterEventsIngestedTotal.inc({
        provider: source,
        type: input.incident_type,
        is_simulated: String(isSimulated)
      });

      logger.info(
        { incidentId: created.id, type: created.incident_type, isSimulated },
        'Created new disaster incident'
      );

      return {
        ...created,
        latitude: Number(created.latitude),
        longitude: Number(created.longitude),
        radius_km: Number(created.radius_km)
      };
    } catch (err: unknown) {
      // Check for duplicate external_id
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
        throw new BadRequestError(`Incident with external ID '${input.external_id}' already exists`);
      }
      throw err;
    }
  }

  /**
   * Update status of an existing incident
   */
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
    const res = await query<Incident>(
      `UPDATE incidents
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, description, incident_type, severity, status, location_name,
                 latitude, longitude, radius_km, event_time, source, is_simulated,
                 external_id, metadata, created_by, created_at, updated_at`,
      [status, id]
    );

    const updated = res.rows[0];
    if (!updated) {
      throw new NotFoundError(`Incident with ID '${id}' not found`);
    }

    logger.info({ incidentId: id, newStatus: status }, 'Updated incident status');

    return {
      ...updated,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      radius_km: Number(updated.radius_km)
    };
  }

  /**
   * Update full incident attributes
   */
  async updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident> {
    const current = await this.getIncidentById(id);

    const title = input.title ?? current.title;
    const description = input.description ?? current.description;
    const incidentType = input.incident_type ?? current.incident_type;
    const severity = input.severity ?? current.severity;
    const status = input.status ?? current.status;
    const locationName = input.location_name ?? current.location_name;
    const latitude = input.latitude ?? current.latitude;
    const longitude = input.longitude ?? current.longitude;
    const radiusKm = input.radius_km ?? current.radius_km;
    const metadata = input.metadata ?? current.metadata;

    const res = await query<Incident>(
      `UPDATE incidents
       SET title = $1, description = $2, incident_type = $3, severity = $4,
           status = $5, location_name = $6, latitude = $7, longitude = $8,
           radius_km = $9, metadata = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING id, title, description, incident_type, severity, status, location_name,
                 latitude, longitude, radius_km, event_time, source, is_simulated,
                 external_id, metadata, created_by, created_at, updated_at`,
      [
        title,
        description,
        incidentType,
        severity,
        status,
        locationName,
        latitude,
        longitude,
        radiusKm,
        JSON.stringify(metadata),
        id
      ]
    );

    const updated = res.rows[0];
    return {
      ...updated,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      radius_km: Number(updated.radius_km)
    };
  }
}

export const incidentService = new IncidentService();
export default incidentService;
