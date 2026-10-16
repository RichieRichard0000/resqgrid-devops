import { DisasterEventProvider } from './types.js';
import { CreateIncidentInput, IncidentSeverity, IncidentType } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ScenarioTemplate {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  location_name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  metadata: Record<string, unknown>;
}

export class SimulatedEventProvider implements DisasterEventProvider {
  public readonly name = 'SIMULATED_PROVIDER';
  public readonly isSimulated = true;

  private scenarios: ScenarioTemplate[] = [
    {
      title: '[SIMULATION] Flash Flood Water Inundation Drill',
      description: 'Simulated high-water runoff drill along drainage channels. Water levels rising near SRM Kattankulathur campus zone.',
      incident_type: 'flood',
      severity: 'high',
      location_name: 'SRM Kattankulathur Sector 3, Chengalpattu',
      latitude: 12.8231,
      longitude: 80.0442,
      radius_km: 18.0,
      metadata: { simulated_depth_cm: 60, drill_id: 'DR-CHN-01', scenario: 'Monsoon flash runoff' }
    },
    {
      title: '[SIMULATION] Coastal Squall & Heavy Rain Surge',
      description: 'Simulated gale force squall drill with wind gusts up to 75 km/h along the coastal boundary.',
      incident_type: 'severe_weather',
      severity: 'medium',
      location_name: 'East Coast Highway, Kovalam - Mahabalipuram',
      latitude: 12.7915,
      longitude: 80.2458,
      radius_km: 35.0,
      metadata: { simulated_wind_kmh: 75, drill_id: 'DR-CHN-02', scenario: 'Coastal Squall' }
    },
    {
      title: '[SIMULATION] Seismic Tremor Shake Drill',
      description: 'Synthetic seismic wave simulation triggering regional alert thresholds for rapid response evaluation.',
      incident_type: 'earthquake',
      severity: 'medium',
      location_name: 'Tambaram Geodetic Monitoring Station, Chennai',
      latitude: 12.9249,
      longitude: 80.1000,
      radius_km: 25.0,
      metadata: { simulated_magnitude: 4.8, depth_km: 10, drill_id: 'DR-CHN-03' }
    },
    {
      title: '[SIMULATION] Chlorine Plume Containment Exercise',
      description: 'Simulated toxic gas dispersal exercise testing rapid evacuation zones and responder perimeter safety.',
      incident_type: 'emergency',
      severity: 'critical',
      location_name: 'Guindy Industrial Estate Safety Sector',
      latitude: 13.0067,
      longitude: 80.2036,
      radius_km: 8.0,
      metadata: { simulated_plume_ppm: 25, drill_id: 'DR-CHN-04', hazmat: 'Chlorine' }
    }
  ];

  async fetchEvents(): Promise<CreateIncidentInput[]> {
    logger.info('Generating simulated disaster events (offline reliable provider)...');

    const timestamp = new Date().toISOString();
    return this.scenarios.map((scenario, index) => ({
      title: scenario.title,
      description: scenario.description,
      incident_type: scenario.incident_type,
      severity: scenario.severity,
      status: 'active',
      location_name: scenario.location_name,
      latitude: scenario.latitude,
      longitude: scenario.longitude,
      radius_km: scenario.radius_km,
      event_time: new Date(),
      source: 'SIMULATED',
      is_simulated: true,
      external_id: `SIM-OFFLINE-${index + 1}-${Date.now().toString().slice(-6)}`,
      metadata: {
        ...scenario.metadata,
        generated_at: timestamp,
        is_official: false,
        warning: 'This is a simulated drill event. Not an official disaster declaration.'
      }
    }));
  }

  async healthCheck(): Promise<boolean> {
    return true; // Always healthy offline
  }

  /**
   * Generates a single dynamic on-demand simulated event (e.g. for testing geofencing near a user)
   */
  generateNearLocation(
    lat: number,
    lon: number,
    type: IncidentType = 'flood',
    severity: IncidentSeverity = 'high',
    title?: string
  ): CreateIncidentInput {
    const id = `SIM-DYN-${Date.now().toString().slice(-6)}`;
    return {
      title: title || `[SIMULATION] Urgent ${type.toUpperCase()} Emergency Drill`,
      description: `Synthetic emergency simulation dispatched near coordinates [${lat.toFixed(4)}, ${lon.toFixed(4)}] to test live geofencing alerting.`,
      incident_type: type,
      severity,
      status: 'active',
      location_name: `Simulated Target (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
      latitude: lat,
      longitude: lon,
      radius_km: 25.0,
      event_time: new Date(),
      source: 'SIMULATED',
      is_simulated: true,
      external_id: id,
      metadata: {
        drill_mode: 'live_interactive',
        generated_at: new Date().toISOString(),
        warning: 'Simulated alert for demonstration and geofence verification only.'
      }
    };
  }
}

export const simulatedProvider = new SimulatedEventProvider();
