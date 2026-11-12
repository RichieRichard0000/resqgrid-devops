import React, { useState } from 'react';
import { Navigation, AlertCircle, CheckCircle2, MapPinOff, Info, RotateCcw, Crosshair, MapPin, ShieldAlert } from 'lucide-react';
import { UserLocation } from '../types/index.js';
import { GeolocationStatus } from '../hooks/useGeolocation.js';

interface LocationControlProps {
  status: GeolocationStatus;
  location: UserLocation | null;
  radiusKm: number;
  errorMessage: string | null;
  onRequestLocation: () => void;
  onRetryLocation?: () => void;
  onSetRadiusKm: (radius: number) => void;
  onClearLocation: () => void;
  onUseTestLocation?: () => void;
  onSetManualCoordinates?: (lat: number, lon: number, name?: string) => void;
  onRecenterMap?: () => void;
}

const RADIUS_PRESETS = [10, 25, 50, 100, 250];

export const LocationControl: React.FC<LocationControlProps> = ({
  status,
  location,
  radiusKm,
  errorMessage,
  onRequestLocation,
  onRetryLocation,
  onSetRadiusKm,
  onClearLocation,
  onUseTestLocation,
  onSetManualCoordinates,
  onRecenterMap
}) => {
  const [customLat, setCustomLat] = useState('12.8230');
  const [customLon, setCustomLon] = useState('80.0444');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  const isErrorState = status === 'denied' || status === 'unavailable' || status === 'timeout';
  const handleRetry = onRetryLocation || onRequestLocation;
  const isManual = location?.source === 'manual';
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;

  const handleApplyCoordinates = (lat: number, lon: number, name?: string) => {
    if (onSetManualCoordinates) {
      onSetManualCoordinates(lat, lon, name);
    } else if (onUseTestLocation) {
      onUseTestLocation();
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError(null);
    const parsedLat = parseFloat(customLat);
    const parsedLon = parseFloat(customLon);

    if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      setCoordError('Latitude must be between -90 and 90, and longitude between -180 and 180.');
      return;
    }

    handleApplyCoordinates(parsedLat, parsedLon, 'Custom Pin');
    setShowCustomInput(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Geolocation status / Prompt */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              location
                ? isManual
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isManual ? (
              <MapPin className="w-5 h-5" />
            ) : (
              <Navigation className={`w-5 h-5 ${status === 'requesting' ? 'animate-spin' : ''}`} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-200">
                Personal Geofenced Alerts
              </h2>
              {location && (
                isManual ? (
                  <span className="flex items-center gap-1 text-[11px] text-purple-400 font-medium bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                    <MapPin className="w-3.5 h-3.5" /> Manual Pin Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> GPS Active
                  </span>
                )
              )}
            </div>

            {location ? (
              <div className="mt-1">
                <p className="text-xs text-slate-300 font-mono">
                  Coordinates: <span className="text-blue-400">{location.latitude.toFixed(4)}°N</span>,{' '}
                  <span className="text-blue-400">{location.longitude.toFixed(4)}°E</span>
                  {location.accuracyMeters !== undefined && (
                    <span className="text-slate-500 text-[10px] ml-1.5">
                      (±{Math.round(location.accuracyMeters)}m accuracy)
                    </span>
                  )}
                  {isManual && (
                    <span className="text-purple-400 text-[10px] ml-1.5 font-sans">
                      [Fixed campus benchmark — not real GPS]
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
                Enable browser GPS to filter real-time disaster alerts by proximity and calculate live distances. Location data remains client-side and is never shared with third parties.
              </p>
            )}

            {/* Error Message Display with Retry Action */}
            {errorMessage && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
                {isErrorState && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[11px] font-semibold transition-colors shrink-0 self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Location</span>
                  </button>
                )}
              </div>
            )}

            {/* HTTPS Notice for Insecure Origins */}
            {!isSecure && !location && (
              <div className="flex items-start gap-2.5 p-3 mt-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-200">
                    HTTPS Required for Browser GPS Geolocation
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Browser location access is restricted to secure contexts (HTTPS or localhost). On plain HTTP (<code>http://16.4.118.98</code>), browsers disable location permissions. Please select a manual location preset or enter custom coordinates below.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Radius Selector */}
        <div className="flex items-center gap-3 flex-wrap self-end md:self-center">
          {location ? (
            <>
              {/* Recenter Map Button */}
              {onRecenterMap && (
                <button
                  type="button"
                  onClick={onRecenterMap}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  title="Center map on your current coordinates"
                >
                  <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                  <span>Center Map</span>
                </button>
              )}

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

              {/* Disable / Clear Location Button */}
              <button
                type="button"
                onClick={onClearLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
                title="Clear current location and unsubscribe from personal geofenced alerts"
              >
                <MapPinOff className="w-3.5 h-3.5" />
                <span>Clear Location</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onRequestLocation}
                  disabled={status === 'requesting'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-600/30 hover:shadow-blue-500/50"
                >
                  <Navigation className={`w-4 h-4 ${status === 'requesting' ? 'animate-spin' : ''}`} />
                  <span>{status === 'requesting' ? 'Acquiring GPS...' : 'Enable My Location'}</span>
                </button>

                {onUseTestLocation && (
                  <button
                    type="button"
                    onClick={onUseTestLocation}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    title="Use fixed SRMIST Campus coordinates (12.823°N, 80.044°E) as a manual test pin without browser GPS"
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>SRMIST Campus Pin (Manual)</span>
                  </button>
                )}

                {onSetManualCoordinates && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApplyCoordinates(12.9249, 80.1000, 'Tambaram')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      title="Set manual pin to Tambaram Sector (12.9249°N, 80.1000°E)"
                    >
                      Tambaram Pin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoordinates(13.0475, 80.2824, 'Marina Beach')}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      title="Set manual pin to Marina Beach Sector (13.0475°N, 80.2824°E)"
                    >
                      Marina Beach Pin
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                    >
                      Custom Pin...
                    </button>
                  </>
                )}
              </div>

              {/* Custom Coordinate Form */}
              {showCustomInput && onSetManualCoordinates && (
                <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 flex-wrap bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Lat:</span>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="12.8230"
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Lon:</span>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={customLon}
                      onChange={(e) => setCustomLon(e.target.value)}
                      placeholder="80.0444"
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-xs shadow-sm"
                  >
                    Set Pin
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                  {coordError && (
                    <span className="text-rose-400 text-[11px] w-full">{coordError}</span>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationControl;
