import React from 'react';
import {
  RefreshCw,
  Fingerprint,
  CreditCard,
  Users,
  Settings,
  UserPlus,
} from 'lucide-react';
import { KioskStep } from '../hooks/useKioskState';

export const Header = ({
  activeTab,
  onTabChange,
  onOpenRegisterFace,
  onOpenSettings,
  step,
  onReset,
}) => {
  const isVerified = step === KioskStep.FULLY_VERIFIED;
  const isDenied = step === KioskStep.MISMATCH;

  return (
    <header className="cyber-card p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-cyan-500/30">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3.5 h-3.5 rounded-full animate-pulse ${
            isVerified
              ? 'bg-emerald-500 shadow-[0_0_12px_#10B981]'
              : isDenied
              ? 'bg-red-500 shadow-[0_0_12px_#EF4444]'
              : 'bg-cyan-500 shadow-[0_0_12px_#06B6D4]'
          }`}
        />
        <div>
          <h1 className="font-orbitron font-bold text-base md:text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 tracking-wider">
            MANTRA MFS 100 BIOMETRIC ERP
          </h1>
          <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
            Mantra MFS 100 Optical Sensor • ISO 19794-2 Fingerprint Identification
          </p>
        </div>
      </div>

      {/* Navigation Modes Bar */}
      <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 gap-1 font-orbitron text-xs">
        <button
          onClick={() => onTabChange('attendance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'attendance'
              ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>ATTENDANCE</span>
        </button>

        <button
          onClick={() => onTabChange('kiosk')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'kiosk'
              ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>KIOSK SERVICES</span>
        </button>

        <button
          onClick={() => onTabChange('students')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'students'
              ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>STUDENTS</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <button
          onClick={onOpenRegisterFace}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-orbitron font-bold transition-all shadow-md active:scale-95"
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ENROLL FINGERPRINT</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1 p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all"
          title="Supabase Database Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1 p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all"
          title="Reset System"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
