import { DisasterEventProvider } from './types.js';
import { CreateIncidentInput, IncidentSeverity } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { applicationErrorsTotal } from '../metrics/index.js';

interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url: string;
    alert: string | null;
    status: string;
    tsunami: number;
    title: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lon, lat, depth]
  };
}

interface UsgsResponse {
  type: string;
  features: UsgsFeature[];
}

export class UsgsEarthquakeProvider implements DisasterEventProvider {
  public readonly name = 'USGS_EARTHQUAKE_FEED';
  public readonly isSimulated = false;

  private mapMagnitudeToSeverity(mag: number | null): IncidentSeverity {
    if (!mag || mag < 3.5) return 'low';
    if (mag < 5.0) return 'medium';
    if (mag < 6.5) return 'high';
    return 'critical';
  }

  private mapMagnitudeToRadiusKm(mag: number | null): number {
    if (!mag || mag <= 2.5) return 20.0;
    // Empirical seismic impact radius estimation
    return Math.min(500, Math.max(25, Math.round(mag * 30)));
  }

  async fetchEvents(): Promise<CreateIncidentInput[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.USGS_TIMEOUT_MS);

    try {
      logger.info({ feedUrl: config.USGS_FEED_URL }, 'Fetching official USGS earthquake feed...');

      const response = await fetch(config.USGS_FEED_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ResQGrid-Disaster-Platform/1.0 (SRM CSE Project)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`USGS feed returned HTTP status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as UsgsResponse;
      if (!data || !Array.isArray(data.features)) {
        throw new Error('USGS response does not contain a valid features array');
      }

      const incidents: CreateIncidentInput[] = [];

      for (const feature of data.features) {
        if (!feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
          continue;
        }

        const [longitude, latitude, depth] = feature.geometry.coordinates;
        // Validate coordinates
        if (
          typeof longitude !== 'number' ||
          typeof latitude !== 'number' ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          continue;
        }

        const mag = feature.properties.mag ?? 0;
        const severity = this.mapMagnitudeToSeverity(mag);
        const radiusKm = this.mapMagnitudeToRadiusKm(mag);
        const title = feature.properties.title || `M ${mag.toFixed(1)} Earthquake`;
        const locationName = feature.properties.place || `Seismic coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;

        incidents.push({
          title,
          description: `Official USGS seismic observation: Magnitude ${mag.toFixed(1)} event recorded at depth ${depth?.toFixed(1) || 0} km. Source: United States Geological Survey.`,
          incident_type: 'earthquake',
          severity,
          status: 'active',
          location_name: locationName,
          latitude,
          longitude,
          radius_km: radiusKm,
          event_time: new Date(feature.properties.time),
          source: 'USGS',
          is_simulated: false,
          external_id: feature.id,
          metadata: {
            magnitude: mag,
            depth_km: depth,
            alert_color: feature.properties.alert,
            tsunami: feature.properties.tsunami,
            usgs_url: feature.properties.url,
            status: feature.properties.status
          }
        });
      }

      logger.info({ count: incidents.length }, 'Successfully parsed incidents from USGS feed');
      return incidents;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const errorMessage = isAbort
        ? `USGS feed request timed out after ${config.USGS_TIMEOUT_MS}ms`
        : error instanceof Error
        ? error.message
        : String(error);

      applicationErrorsTotal.inc({ error_type: 'USGSProviderError', component: 'ingestion' });
      logger.warn(
        { error: errorMessage, isTimeout: isAbort },
        'USGS earthquake feed unavailable or error encountered. Gracefully continuing without external feed.'
      );

      // Graceful degradation: do not throw or crash the platform
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(config.USGS_FEED_URL, {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }
}

export const usgsProvider = new UsgsEarthquakeProvider();
