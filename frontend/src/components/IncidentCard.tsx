import React from 'react';
import { Waves, CloudRain, Flame, AlertCircle, MapPin, Clock } from 'lucide-react';
import { Incident, IncidentType, IncidentSeverity } from '../types/index.js';

interface IncidentCardProps {
  incident: Incident;
  isSelected?: boolean;
  onSelect: (incident: Incident) => void;
}

export const getTypeIcon = (type: IncidentType) => {
  switch (type) {
    case 'flood':
      return <Waves className="w-4 h-4 text-blue-400" />;
    case 'severe_weather':
      return <CloudRain className="w-4 h-4 text-cyan-400" />;
    case 'earthquake':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    case 'emergency':
    default:
      return <Flame className="w-4 h-4 text-rose-400" />;
  }
};

export const getSeverityBadge = (severity: IncidentSeverity) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    case 'low':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  }
};

export const formatRelativeTime = (isoString: string): string => {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return isoString;
  }
};

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  isSelected = false,
  onSelect
}) => {
  return (
    <div
      onClick={() => onSelect(incident)}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
        isSelected
          ? 'bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500'
          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Severity + Provenance + Time */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Severity */}
          <span
            className={`px-2 py-0.5 rounded font-black uppercase tracking-wider border ${getSeverityBadge(
              incident.severity
            )}`}
          >
            {incident.severity}
          </span>

          {/* Provenance: Simulated vs Official */}
          {incident.is_simulated ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-[10px]">
              Simulated Drill
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
              Official: {incident.source}
            </span>
          )}

          {/* Status */}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
              incident.status === 'active'
                ? 'bg-rose-950 text-rose-300'
                : incident.status === 'investigating'
                ? 'bg-amber-950 text-amber-300'
                : 'bg-emerald-950 text-emerald-300'
            }`}
          >
            {incident.status}
          </span>
        </div>

        {/* Timestamp */}
        <span className="text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {formatRelativeTime(incident.event_time)}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
          {getTypeIcon(incident.incident_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100 truncate hover:text-blue-400 transition-colors">
            {incident.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {incident.description}
          </p>
        </div>
      </div>

      {/* Footer: Location & Distance */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{incident.location_name}</span>
        </span>

        {incident.distance_km !== undefined && (
          <span className="shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-900/60">
            {incident.distance_km.toFixed(1)} km away
          </span>
        )}
      </div>
    </div>
  );
};

export default IncidentCard;
