import React from 'react';
import { BellRing, MapPin, X } from 'lucide-react';
import { GeofenceAlert } from '../types/index.js';

interface AlertBannerProps {
  alerts: GeofenceAlert[];
  onDismiss: (incidentId: string) => void;
  onFocusIncident: (incidentId: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss, onFocusIncident }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 max-w-4xl mx-auto flex flex-col gap-2 pointer-events-none">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'critical';
        const isHigh = alert.severity === 'high';

        return (
          <div
            key={`${alert.incident.id}-${alert.timestamp}`}
            className={`pointer-events-auto rounded-xl p-4 shadow-2xl border transition-all animate-bounce-short flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isCritical
                ? 'bg-red-950/95 border-red-500 text-red-100 shadow-red-950/50'
                : isHigh
                ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50'
                : 'bg-blue-950/95 border-blue-500 text-blue-100 shadow-blue-950/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isCritical ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-600 text-white'
                }`}
              >
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/20">
                    {alert.severity} • {alert.incident.incident_type.replace('_', ' ')}
                  </span>

                  {alert.is_simulated ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/30">
                      Simulated Drill
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                      Official Source: {alert.incident.source}
                    </span>
                  )}

                  <span className="text-xs flex items-center gap-1 font-mono text-white/90 bg-white/10 px-2 py-0.5 rounded">
                    <MapPin className="w-3 h-3 text-red-400" />
                    {alert.distance_km.toFixed(1)} km away
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base mt-1 text-white">
                  {alert.incident.title}
                </h3>
                <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                  {alert.incident.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => onFocusIncident(alert.incident.id)}
                className="px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all shadow"
              >
                View on Map
              </button>
              <button
                onClick={() => onDismiss(alert.incident.id)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertBanner;
