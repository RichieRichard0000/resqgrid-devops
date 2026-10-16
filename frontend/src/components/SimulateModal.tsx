import React, { useState } from 'react';
import { X, Flame, Send } from 'lucide-react';
import { IncidentType, IncidentSeverity, UserLocation } from '../types/index.js';

interface SimulateModalProps {
  userLocation: UserLocation | null;
  onClose: () => void;
  onDispatch: (payload: {
    incident_type: IncidentType;
    severity: IncidentSeverity;
    latitude: number;
    longitude: number;
    radius_km: number;
    title: string;
    location_name: string;
  }) => Promise<void>;
}

export const SimulateModal: React.FC<SimulateModalProps> = ({
  userLocation,
  onClose,
  onDispatch
}) => {
  const [type, setType] = useState<IncidentType>('flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('high');
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('SRM Kattankulathur Sector');
  const [latitude, setLatitude] = useState(userLocation ? userLocation.latitude : 12.823);
  const [longitude, setLongitude] = useState(userLocation ? userLocation.longitude : 80.0444);
  const [radiusKm, setRadiusKm] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'user':
        if (userLocation) {
          setLatitude(userLocation.latitude);
          setLongitude(userLocation.longitude);
          setLocationName('Near Current User GPS Location');
        }
        break;
      case 'srm':
        setLatitude(12.823);
        setLongitude(80.0444);
        setLocationName('SRM University Campus, Kattankulathur');
        break;
      case 'tambaram':
        setLatitude(12.9249);
        setLongitude(80.1);
        setLocationName('Tambaram Junction Sector');
        break;
      case 'marina':
        setLatitude(13.0475);
        setLongitude(80.2824);
        setLocationName('Marina Beach Coastal Sector');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const generatedTitle =
      title.trim() || `[SIMULATION] Urgent ${type.toUpperCase()} Emergency Drill`;

    try {
      await onDispatch({
        incident_type: type,
        severity,
        latitude,
        longitude,
        radius_km: radiusKm,
        title: generatedTitle,
        location_name: locationName
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to dispatch simulated event. Ensure you are signed in as Admin/Responder.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Manual Disaster Simulation</h3>
              <p className="text-xs text-slate-400">
                Dispatches a live simulated event to test geofencing & real-time WebSocket delivery
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* Quick Coordinate Presets */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
              Location Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {userLocation && (
                <button
                  type="button"
                  onClick={() => applyPreset('user')}
                  className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 rounded-lg font-medium"
                >
                  My Current GPS ({userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)})
                </button>
              )}
              <button
                type="button"
                onClick={() => applyPreset('srm')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                SRM Kattankulathur
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tambaram')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Tambaram
              </button>
              <button
                type="button"
                onClick={() => applyPreset('marina')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Marina Beach
              </button>
            </div>
          </div>

          {/* Hazard Type & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Disaster Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IncidentType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="flood">Flood Inundation</option>
                <option value="severe_weather">Severe Weather / Squall</option>
                <option value="earthquake">Earthquake Tremor</option>
                <option value="emergency">Chemical / Industrial Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Coordinates & Radius */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Impact Radius (km)
              </label>
              <input
                type="number"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono"
                min="1"
                max="500"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Drill Scenario Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash Flood Water Inundation Drill"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
            />
          </div>

          {/* Location Name */}
          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Location Descriptor
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200"
              required
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-lg shadow-amber-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Drill Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimulateModal;
