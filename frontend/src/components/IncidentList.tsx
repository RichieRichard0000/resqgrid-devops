import React from 'react';
import { AlertCircle, RotateCcw, Inbox } from 'lucide-react';
import { Incident } from '../types/index.js';
import IncidentCard from './IncidentCard.js';

interface IncidentListProps {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
  onRetry: () => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  isLoading,
  error,
  selectedIncident,
  onSelectIncident,
  onRetry
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-100">Live Incident Feed</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold">
            {incidents.length}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Real-Time Ingestion</span>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[calc(100vh-280px)] min-h-[350px]">
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3 p-2" data-testid="loading-skeletons">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 animate-pulse space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-800 rounded w-24"></div>
                  <div className="h-3 bg-slate-800 rounded w-16"></div>
                </div>
                <div className="h-4 bg-slate-850 rounded w-3/4"></div>
                <div className="h-3 bg-slate-850 rounded w-full"></div>
                <div className="h-3 bg-slate-850 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-6 text-center space-y-3" data-testid="error-state">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-300">Failed to load incident feed</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{error}</p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && incidents.length === 0 && (
          <div className="p-8 text-center space-y-3" data-testid="empty-state">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-300">No active incidents matching filters</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Try widening your geographic radius, clearing filter pills, or trigger a simulated drill.
              </p>
            </div>
          </div>
        )}

        {/* Cards */}
        {!isLoading &&
          !error &&
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              isSelected={selectedIncident?.id === incident.id}
              onSelect={onSelectIncident}
            />
          ))}
      </div>
    </div>
  );
};

export default IncidentList;
