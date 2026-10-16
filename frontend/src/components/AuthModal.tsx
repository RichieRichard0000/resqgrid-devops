import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '../types/index.js';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickFill = (role: 'admin' | 'responder' | 'citizen') => {
    switch (role) {
      case 'admin':
        setEmail('admin@resqgrid.local');
        setPassword('Admin123!');
        break;
      case 'responder':
        setEmail('responder@resqgrid.local');
        setPassword('Responder123!');
        break;
      case 'citizen':
        setEmail('citizen@resqgrid.local');
        setPassword('Citizen123!');
        break;
    }
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);
      onSuccess(data.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ResQGrid Authentication</h3>
              <p className="text-xs text-slate-400">Access administrator and responder capabilities</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleLogin} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* Quick Demo Fill Buttons */}
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
              Evaluation Role Presets
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-center font-medium"
              >
                <div className="font-bold text-red-400">Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('responder')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-center font-medium"
              >
                <div className="font-bold text-amber-400">Responder</div>
                <div className="text-[10px] text-slate-500">Field Updates</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('citizen')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-center font-medium"
              >
                <div className="font-bold text-blue-400">Citizen</div>
                <div className="text-[10px] text-slate-500">Observer</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              placeholder="user@resqgrid.local"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-600/30"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
