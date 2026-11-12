import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import L from 'leaflet';
import IncidentMap from '../src/components/IncidentMap.js';
import { Incident, UserLocation } from '../src/types/index.js';

// Mock Leaflet
vi.mock('leaflet', () => {
  const mapMock = {
    setView: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    getZoom: vi.fn().mockReturnValue(10),
    remove: vi.fn()
  };

  const markerMock = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    setIcon: vi.fn().mockReturnThis(),
    setPopupContent: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn()
  };

  const circleMock = {
    addTo: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    setRadius: vi.fn().mockReturnThis(),
    setTooltipContent: vi.fn().mockReturnThis(),
    remove: vi.fn()
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(mapMock),
      marker: vi.fn().mockReturnValue(markerMock),
      circle: vi.fn().mockReturnValue(circleMock),
      divIcon: vi.fn().mockReturnValue({}),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      control: { zoom: vi.fn().mockReturnValue({ addTo: vi.fn() }) }
    }
  };
});

describe('IncidentMap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockIncidents: Incident[] = [
    {
      id: 'inc-1',
      title: 'Earthquake Drill',
      description: 'Test drill event',
      incident_type: 'earthquake',
      severity: 'high',
      status: 'active',
      location_name: 'Tambaram',
      latitude: 12.9249,
      longitude: 80.1,
      radius_km: 15,
      event_time: new Date().toISOString(),
      source: 'SIMULATED',
      is_simulated: true,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  it('initializes map and centers on [lat, lon] coordinates', () => {
    render(
      <IncidentMap
        incidents={mockIncidents}
        userLocation={null}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    expect(L.map).toHaveBeenCalledTimes(1);
    const mapArgs = (L.map as any).mock.calls[0][1];
    // Must be [lat, lon], not [lon, lat]
    expect(mapArgs.center[0]).toBeCloseTo(12.823, 2); // Latitude
    expect(mapArgs.center[1]).toBeCloseTo(80.044, 2); // Longitude
  });

  it('centers map on user location via flyTo when user coordinates are acquired', () => {
    const userLoc: UserLocation = {
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 20,
      radiusKm: 25,
      source: 'gps'
    };

    const { rerender } = render(
      <IncidentMap
        incidents={mockIncidents}
        userLocation={null}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    const mapInstance = (L.map as any).mock.results[0].value;

    rerender(
      <IncidentMap
        incidents={mockIncidents}
        userLocation={userLoc}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    // flyTo must be called with [lat, lon]
    expect(mapInstance.flyTo).toHaveBeenCalled();
    const flyArgs = mapInstance.flyTo.mock.calls[0];
    expect(flyArgs[0]).toEqual([13.0827, 80.2707]);
  });

  it('renders GPS accuracy circle and alert perimeter circle when GPS location is active', () => {
    const userLoc: UserLocation = {
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 25,
      radiusKm: 30,
      source: 'gps'
    };

    render(
      <IncidentMap
        incidents={mockIncidents}
        userLocation={userLoc}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    // Should create circles for accuracy radius (25m) and alert perimeter (30000m)
    expect(L.circle).toHaveBeenCalledWith(
      [13.0827, 80.2707],
      expect.objectContaining({ radius: 25 })
    );
    expect(L.circle).toHaveBeenCalledWith(
      [13.0827, 80.2707],
      expect.objectContaining({ radius: 30000 })
    );
  });

  it('renders floating "My Location" recenter button and triggers flyTo on click', () => {
    const userLoc: UserLocation = {
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 10,
      radiusKm: 25,
      source: 'gps'
    };

    render(
      <IncidentMap
        incidents={mockIncidents}
        userLocation={userLoc}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    const mapInstance = (L.map as any).mock.results[0].value;
    mapInstance.flyTo.mockClear();

    const recenterBtn = screen.getByText('My Location');
    expect(recenterBtn).toBeInTheDocument();

    fireEvent.click(recenterBtn);
    expect(mapInstance.flyTo).toHaveBeenCalledWith([13.0827, 80.2707], expect.any(Number), expect.any(Object));
  });
});
