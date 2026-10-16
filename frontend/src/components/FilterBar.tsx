import React from 'react';
import { Search, Waves, CloudRain, Flame, AlertCircle, Layers } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  selectedType: string;
  selectedSeverity: string;
  selectedSource: string; // 'all' | 'official' | 'simulated'
  onSearchChange: (q: string) => void;
  onTypeChange: (type: string) => void;
  onSeverityChange: (severity: string) => void;
  onSourceChange: (source: string) => void;
}

const TYPES: { label: string; value: string; icon: React.ReactNode }[] = [
  { label: 'All Hazards', value: '', icon: <Layers className="w-3.5 h-3.5" /> },
  { label: 'Floods', value: 'flood', icon: <Waves className="w-3.5 h-3.5" /> },
  { label: 'Earthquakes', value: 'earthquake', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { label: 'Severe Weather', value: 'severe_weather', icon: <CloudRain className="w-3.5 h-3.5" /> },
  { label: 'Emergencies', value: 'emergency', icon: <Flame className="w-3.5 h-3.5" /> }
];

const SEVERITIES: { label: string; value: string; color: string }[] = [
  { label: 'All Severities', value: '', color: 'bg-slate-700' },
  { label: 'Critical', value: 'critical', color: 'bg-red-500' },
  { label: 'High', value: 'high', color: 'bg-orange-500' },
  { label: 'Medium', value: 'medium', color: 'bg-yellow-500' },
  { label: 'Low', value: 'low', color: 'bg-blue-500' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  selectedType,
  selectedSeverity,
  selectedSource,
  onSearchChange,
  onTypeChange,
  onSeverityChange,
  onSourceChange
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col gap-3">
      {/* Top row: Search input & Source toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident, location, keywords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Source Provenance Filter: Official vs Simulated */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto">
          <span className="text-[11px] text-slate-400 px-2 font-medium">Source:</span>
          <button
            onClick={() => onSourceChange('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              selectedSource === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onSourceChange('official')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              selectedSource === 'official'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Official Feeds
          </button>
          <button
            onClick={() => onSourceChange('simulated')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              selectedSource === 'simulated'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Simulated Drills
          </button>
        </div>
      </div>

      {/* Bottom row: Type pills & Severity selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Type Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onTypeChange(t.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                selectedType === t.value
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Severity Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              onClick={() => onSeverityChange(s.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                selectedSeverity === s.value
                  ? 'bg-slate-800 text-white border-slate-600 shadow'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
