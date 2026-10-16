import React, { useState } from 'react';
import { X, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { Incident, IncidentStatus, User } from '../types/index.js';
import { getTypeIcon, getSeverityBadge } from './IncidentCard.js';

interface IncidentDetailModalProps {
  incident: Incident | null;
  currentUser: User | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: IncidentStatus) => Promise<void>;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  currentUser,
  onClose,
  onUpdateStatus
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(
    incident?.status || 'active'
  );

  if (!incident) return null;

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'responder';

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(incident.id, newStatus);
      setSelectedStatus(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              {getTypeIcon(incident.incident_type)}
            </div>
            <div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityBadge(
                  incident.severity
                )}`}
              >
                {incident.severity} • {incident.incident_type}
              </span>
              <h2 className="text-base font-bold text-white mt-1 line-clamp-1">{incident.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Provenance Banner */}
          {incident.is_simulated ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
              <strong className="block font-semibold">Simulated Drill / Exercise Notice</strong>
              This is a synthetic event generated for system testing, latency evaluation, and response drilling. It does not represent an official civil emergency declaration.
            </div>
          ) : (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
              <strong className="block font-semibold">Official Incident Provenance</strong>
              Verified observation ingested from official source: <strong>{incident.source}</strong> (External ID: {incident.external_id || 'N/A'}).
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-1">
              Incident Overview
            </h4>
            <p className="text-slate-200 text-sm leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {incident.description}
            </p>
          </div>

          {/* Location & Time details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Geospatial Location
              </span>
              <p className="font-semibold text-slate-200">{incident.location_name}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                {incident.latitude.toFixed(4)}°N, {incident.longitude.toFixed(4)}°E
              </p>
              <p className="text-cyan-400 text-[11px]">Impact Radius: {incident.radius_km} km</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Event Timing
              </span>
              <p className="font-semibold text-slate-200">
                {new Date(incident.event_time).toLocaleString()}
              </p>
              <p className="text-slate-400 text-[11px]">
                Reported: {new Date(incident.created_at).toLocaleTimeString()}
              </p>
              <p className="text-slate-400 text-[11px]">
                Status: <span className="uppercase font-bold text-white">{incident.status}</span>
              </p>
            </div>
          </div>

          {/* Technical Metadata */}
          {Object.keys(incident.metadata || {}).length > 0 && (
            <div>
              <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-1">
                Telemetry & Sensor Metadata
              </h4>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(incident.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Status Update Control for Admin / Responders */}
          {canManage && (
            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-slate-300 font-bold flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Incident Response Management ({currentUser?.role})</span>
              </h4>
              <div className="flex items-center gap-2">
                {(['active', 'investigating', 'resolved'] as IncidentStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={isUpdating || selectedStatus === st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedStatus === st
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailModal;
