import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatedEventProvider } from '../../src/providers/simulatedProvider.js';
import { UsgsEarthquakeProvider } from '../../src/providers/usgsProvider.js';
import { SevereWeatherProvider } from '../../src/providers/weatherProvider.js';

describe('Disaster Event Providers', () => {
  describe('SimulatedEventProvider (Offline Reliable)', () => {
    const provider = new SimulatedEventProvider();

    it('identifies as simulated with correct provider name', () => {
      expect(provider.name).toBe('SIMULATED_PROVIDER');
      expect(provider.isSimulated).toBe(true);
    });

    it('fetches predefined drill scenarios offline with simulated tags', async () => {
      const events = await provider.fetchEvents();
      expect(events.length).toBeGreaterThan(0);

      events.forEach((ev) => {
        expect(ev.is_simulated).toBe(true);
        expect(ev.source).toBe('SIMULATED');
        expect(ev.latitude).toBeDefined();
        expect(ev.longitude).toBeDefined();
        expect(ev.radius_km).toBeGreaterThan(0);
        expect(ev.title).toContain('[SIMULATION]');
      });
    });

    it('generates an on-demand drill event near given coordinates', () => {
      const drill = provider.generateNearLocation(12.823, 80.044, 'flood', 'critical');
      expect(drill.is_simulated).toBe(true);
      expect(drill.incident_type).toBe('flood');
      expect(drill.severity).toBe('critical');
      expect(drill.latitude).toBe(12.823);
      expect(drill.longitude).toBe(80.044);
    });

    it('passes health check offline', async () => {
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('UsgsEarthquakeProvider (External Feed & Error Resilience)', () => {
    let provider: UsgsEarthquakeProvider;
    const originalFetch = global.fetch;

    beforeEach(() => {
      provider = new UsgsEarthquakeProvider();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('successfully parses valid USGS GeoJSON feed', async () => {
      const mockGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            id: 'us7000test1',
            properties: {
              mag: 5.4,
              place: '45 km SW of Test Location',
              time: 1729000000000,
              url: 'https://earthquake.usgs.gov/test',
              alert: 'yellow',
              status: 'reviewed',
              tsunami: 0,
              title: 'M 5.4 - 45 km SW of Test Location'
            },
            geometry: {
              type: 'Point',
              coordinates: [93.5, 12.4, 25.0] // [lon, lat, depth]
            }
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeoJson
      } as unknown as Response);

      const events = await provider.fetchEvents();
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.external_id).toBe('us7000test1');
      expect(event.incident_type).toBe('earthquake');
      expect(event.severity).toBe('high'); // 5.4 is high
      expect(event.is_simulated).toBe(false);
      expect(event.source).toBe('USGS');
      expect(event.latitude).toBe(12.4);
      expect(event.longitude).toBe(93.5);
      expect(event.metadata?.magnitude).toBe(5.4);
      expect(event.metadata?.depth_km).toBe(25.0);
    });

    it('handles HTTP error responses (e.g. 500) gracefully without crashing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as unknown as Response);

      const events = await provider.fetchEvents();
      // Should not throw, returns empty array
      expect(events).toEqual([]);
    });

    it('handles network timeouts (AbortError) gracefully without crashing', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const events = await provider.fetchEvents();
      expect(events).toEqual([]);
    });

    it('handles malformed JSON response gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: 'data' })
      } as unknown as Response);

      const events = await provider.fetchEvents();
      expect(events).toEqual([]);
    });
  });

  describe('SevereWeatherProvider (Open-Meteo)', () => {
    let provider: SevereWeatherProvider;
    const originalFetch = global.fetch;

    beforeEach(() => {
      provider = new SevereWeatherProvider();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('creates severe weather incident when weather threshold is exceeded', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            wind_speed_10m: 65, // Severe squall
            precipitation: 30,
            weather_code: 95
          }
        })
      } as unknown as Response);

      const events = await provider.fetchEvents();
      expect(events.length).toBe(1);
      expect(events[0].incident_type).toBe('severe_weather');
      expect(events[0].severity).toBe('high');
      expect(events[0].is_simulated).toBe(false);
    });

    it('returns empty when weather is normal', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            wind_speed_10m: 15,
            precipitation: 0
          }
        })
      } as unknown as Response);

      const events = await provider.fetchEvents();
      expect(events).toEqual([]);
    });

    it('handles network failures gracefully without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS lookup failure'));
      const events = await provider.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
