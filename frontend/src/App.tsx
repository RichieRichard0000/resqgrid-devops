import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.js';
import AlertBanner from './components/AlertBanner.js';
import LocationControl from './components/LocationControl.js';
import FilterBar from './components/FilterBar.js';
import IncidentMap from './components/IncidentMap.js';
import IncidentList from './components/IncidentList.js';
import IncidentDetailModal from './components/IncidentDetailModal.js';
import SimulateModal from './components/SimulateModal.js';
import AuthModal from './components/AuthModal.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useSocket } from './hooks/useSocket.js';
import { api, IncidentFilterParams } from './services/api.js';
import { Incident, GeofenceAlert, User, IncidentStatus } from './types/index.js';

export function App() {
  // Geolocation & Personal Geofence
  const {
    status: geoStatus,
    location: userLocation,
    radiusKm,
    errorMessage: geoError,
    requestLocation,
    setRadiusKm,
    clearLocation
  } = useGeolocation(50);

  // Incidents State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');

  // Real-Time Alerts
  const [activeAlerts, setActiveAlerts] = useState<GeofenceAlert[]>([]);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modals
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Load Incidents from API
  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    const params: IncidentFilterParams = {
      page: 1,
      limit: 50,
      search: searchQuery || undefined,
      type: selectedType || undefined,
      severity: selectedSeverity || undefined
    };

    if (selectedSource === 'official') {
      params.is_simulated = false;
    } else if (selectedSource === 'simulated') {
      params.is_simulated = true;
    }

    if (userLocation) {
      params.lat = userLocation.latitude;
      params.lon = userLocation.longitude;
      params.radius_km = radiusKm;
    }

    try {
      const response = await api.getIncidents(params);
      setIncidents(response.data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch incident feed');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedType, selectedSeverity, selectedSource, userLocation, radiusKm]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Real-Time Socket.IO Hook
  const { connectionStatus } = useSocket({
    userLocation,
    onIncidentEvent: useCallback((event: { action: string; incident: Incident }) => {
      setIncidents((prev) => {
        const index = prev.findIndex((i) => i.id === event.incident.id);
        if (index >= 0) {
          // Update existing incident
          const copy = [...prev];
          copy[index] = { ...copy[index], ...event.incident };
          return copy;
        } else {
          // Prepend new incident to live feed
          return [event.incident, ...prev];
        }
      });
    }, []),
    onGeofenceAlert: useCallback((alert: GeofenceAlert) => {
      setActiveAlerts((prev) => [alert, ...prev.slice(0, 4)]);
    }, [])
  });

  const handleDismissAlert = (incidentId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.incident.id !== incidentId));
  };

  const handleFocusIncident = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (inc) {
      setSelectedIncident(inc);
    }
    handleDismissAlert(incidentId);
  };

  const handleUpdateStatus = async (id: string, status: IncidentStatus) => {
    const updated = await api.updateIncidentStatus(id, status);
    setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    if (selectedIncident?.id === id) {
      setSelectedIncident(updated);
    }
  };

  const handleDispatchSimulation = async (payload: {
    incident_type: any;
    severity: any;
    latitude: number;
    longitude: number;
    radius_km: number;
    title: string;
    location_name: string;
  }) => {
    const created = await api.triggerSimulation(payload);
    setIncidents((prev) => [created, ...prev]);
    setSelectedIncident(created);
  };

  const handleLogout = () => {
    localStorage.removeItem('resqgrid_token');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        connectionStatus={connectionStatus}
        currentUser={currentUser}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Floating Real-Time Emergency Alerts */}
      <AlertBanner
        alerts={activeAlerts}
        onDismiss={handleDismissAlert}
        onFocusIncident={handleFocusIncident}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        {/* Geolocation & Radius Settings */}
        <LocationControl
          status={geoStatus}
          location={userLocation}
          radiusKm={radiusKm}
          errorMessage={geoError}
          onRequestLocation={requestLocation}
          onSetRadiusKm={setRadiusKm}
          onClearLocation={clearLocation}
        />

        {/* Hazard & Severity Filters */}
        <FilterBar
          searchQuery={searchQuery}
          selectedType={selectedType}
          selectedSeverity={selectedSeverity}
          selectedSource={selectedSource}
          onSearchChange={setSearchQuery}
          onTypeChange={setSelectedType}
          onSeverityChange={setSelectedSeverity}
          onSourceChange={setSelectedSource}
        />

        {/* Grid: Interactive Map + Live Incident List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
          {/* Map Column (7 cols on large screens) */}
          <div className="lg:col-span-7 h-[420px] lg:h-[640px]">
            <IncidentMap
              incidents={incidents}
              userLocation={userLocation}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>

          {/* List Column (5 cols on large screens) */}
          <div className="lg:col-span-5 h-[420px] lg:h-[640px]">
            <IncidentList
              incidents={incidents}
              isLoading={isLoading}
              error={fetchError}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              onRetry={loadIncidents}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <IncidentDetailModal
        incident={selectedIncident}
        currentUser={currentUser}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {isSimulateOpen && (
        <SimulateModal
          userLocation={userLocation}
          onClose={() => setIsSimulateOpen(false)}
          onDispatch={handleDispatchSimulation}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </div>
  );
}

export default App;
