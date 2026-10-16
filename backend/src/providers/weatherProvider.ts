import { DisasterEventProvider } from './types.js';
import { CreateIncidentInput } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { applicationErrorsTotal } from '../metrics/index.js';

export class SevereWeatherProvider implements DisasterEventProvider {
  public readonly name = 'OPEN_METEO_WEATHER_FEED';
  public readonly isSimulated = false;

  async fetchEvents(): Promise<CreateIncidentInput[]> {
    try {
      logger.info('Checking regional severe weather indicators (Open-Meteo adapter)...');

      // Sample regional coordinates for monitoring (e.g. Bay of Bengal, Chennai Corridor)
      // In production Phase 2, this can poll real Open-Meteo marine/weather API:
      // https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=wind_speed_10m,precipitation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=wind_speed_10m,precipitation,weather_code&hourly=wind_speed_10m';

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Open-Meteo returned status ${res.status}`);
      }

      const data = (await res.json()) as {
        current?: {
          wind_speed_10m?: number;
          precipitation?: number;
          weather_code?: number;
        };
      };

      const windSpeed = data.current?.wind_speed_10m ?? 20;
      const precipitation = data.current?.precipitation ?? 0;

      // Only generate incident if severe threshold is met (e.g. wind > 50km/h or precipitation > 20mm)
      if (windSpeed > 50 || precipitation > 20) {
        return [
          {
            title: 'High Wind and Heavy Rain Advisory - Bay of Bengal Sector',
            description: `Automated meteorological observation: Sustained winds of ${windSpeed} km/h and precipitation rate of ${precipitation} mm/h detected along coastal front.`,
            incident_type: 'severe_weather',
            severity: windSpeed > 75 ? 'critical' : 'high',
            status: 'active',
            location_name: 'Bay of Bengal Coastal Sector, Chennai',
            latitude: 13.0827,
            longitude: 80.2707,
            radius_km: 40.0,
            event_time: new Date(),
            source: 'OPEN_METEO',
            is_simulated: false,
            external_id: `METEO-${Date.now().toString().slice(-8)}`,
            metadata: {
              wind_speed_kmh: windSpeed,
              precipitation_mm: precipitation,
              weather_code: data.current?.weather_code
            }
          }
        ];
      }

      logger.info('Open-Meteo weather check completed: current conditions within normal parameters');
      return [];
    } catch (err: unknown) {
      applicationErrorsTotal.inc({ error_type: 'WeatherProviderError', component: 'ingestion' });
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Severe weather provider encountered an error or network timeout. Continuing without weather feed.'
      );
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=wind_speed_10m', {
        method: 'HEAD'
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const weatherProvider = new SevereWeatherProvider();
