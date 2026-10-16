import React from 'react';
import { Navigation, AlertCircle, CheckCircle2, MapPinOff, Info } from 'lucide-react';
import { UserLocation } from '../types/index.js';
import { GeolocationStatus } from '../hooks/useGeolocation.js';

interface LocationControlProps {
  status: GeolocationStatus;
  location: UserLocation | null;
  radiusKm: number;
  errorMessage: string | null;
  onRequestLocation: () => void;
  onSetRadiusKm: (radius: number) => void;
  onClearLocation: () => void;
}

const RADIUS_PRESETS = [10, 25, 50, 100, 250];

export const LocationControl: React.FC<LocationControlProps> = ({
  status,
  location,
  radiusKm,
  errorMessage,
  onRequestLocation,
  onSetRadiusKm,
  onClearLocation
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Geolocation status / Prompt */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              location
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Navigation className={`w-5 h-5 ${status === 'requesting' ? 'animate-spin' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-200">
                Personal Geofenced Alerts
              </h2>
              {location && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> GPS Active
                </span>
              )}
            </div>

            {location ? (
              <div className="mt-1">
                <p className="text-xs text-slate-300 font-mono">
                  Coordinates: <span className="text-blue-400">{location.latitude.toFixed(4)}°N</span>,{' '}
                  <span className="text-blue-400">{location.longitude.toFixed(4)}°E</span>
                  {location.accuracyMeters && (
                    <span className="text-slate-500 text-[10px] ml-1.5">
                      (±{Math.round(location.accuracyMeters)}m)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                  <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>
                    Notification perimeter: <strong className="text-cyan-300">{radiusKm} km</strong>. (Personal alert radius, not an evacuation boundary).
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Enable GPS to filter real-time disaster alerts by proximity and calculate live distances. Location data is retained on client session only.
              </p>
            )}

            {/* Error Message Display */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Radius Selector */}
        <div className="flex items-center gap-3 flex-wrap self-end md:self-center">
          {location ? (
            <>
              {/* Radius Preset Pills */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80">
                <span className="text-[11px] text-slate-400 px-2 font-medium">Radius:</span>
                {RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onSetRadiusKm(preset)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      radiusKm === preset
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {preset} km
                  </button>
                ))}
              </div>

              {/* Disable Location Button */}
              <button
                onClick={onClearLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
                title="Disable Location"
              >
                <MapPinOff className="w-3.5 h-3.5" />
                <span>Clear GPS</span>
              </button>
            </>
          ) : (
            <button
              onClick={onRequestLocation}
              disabled={status === 'requesting'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-600/30 hover:shadow-blue-500/50"
            >
              <Navigation className="w-4 h-4" />
              <span>{status === 'requesting' ? 'Acquiring GPS...' : 'Enable My Location'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationControl;
