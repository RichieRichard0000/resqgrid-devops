import React from 'react';
import { ShieldAlert, Radio, Flame, User as UserIcon, LogOut } from 'lucide-react';
import { SocketConnectionStatus } from '../hooks/useSocket.js';
import { User } from '../types/index.js';

interface HeaderProps {
  connectionStatus: SocketConnectionStatus;
  currentUser: User | null;
  onOpenSimulate: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  currentUser,
  onOpenSimulate,
  onOpenAuth,
  onLogout
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="bg-red-600/20 text-red-500 p-2 rounded-lg border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                ResQGrid
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                  Phase 1 Foundation
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              Real-Time Disaster Alert & Response Platform • SRM CSE Final Year Project
            </p>
          </div>
        </div>

        {/* Real-time status indicator & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Connection Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                : connectionStatus === 'connecting'
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
            }`}
            data-testid="connection-status-pill"
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                connectionStatus === 'connected' ? 'animate-pulse text-emerald-400' : ''
              }`}
            />
            <span>
              {connectionStatus === 'connected'
                ? 'Real-Time Connected'
                : connectionStatus === 'connecting'
                ? 'Connecting Engine...'
                : 'Service Offline'}
            </span>
          </div>

          {/* Trigger Simulation Button */}
          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            title="Trigger a simulated disaster event to test geofencing and real-time alerts"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Drill</span>
          </button>

          {/* User Auth Info */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-200 font-medium">{currentUser.full_name}</span>
              <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-bold tracking-wider">
                {currentUser.role}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 ml-1 p-0.5"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-blue-500/30"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Roles</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
