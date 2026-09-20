import React from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Scan,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { KioskStep } from '../hooks/useKioskState';

export const FingerprintVerificationCard = ({
  step,
  identifiedStudent,
  matchPercentage,
  isScanning,
  deviceStatus,
  onScanFingerprint,
  onSimulateFingerprint,
}) => {
  const isPassed = step === KioskStep.AWAITING_NFC || step === KioskStep.FULLY_VERIFIED;
  const isFailed = step === KioskStep.MISMATCH;
  const isActiveScanning = step === KioskStep.SCANNING_FINGERPRINT || isScanning;

  return (
    <div
      className={`cyber-card p-4 flex flex-col justify-between h-full border-2 transition-all ${
        isPassed
          ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          : isFailed
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          : isActiveScanning
          ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          : 'border-slate-800'
      }`}
    >
      {/* Step 1 Title Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-cyan-400" />
          <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-400">
            STEP 1: MANTRA MFS 100 BIOMETRIC SCAN
          </h2>
        </div>
        {matchPercentage > 0 && (
          <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-mono font-bold text-xs">
            MATCH: {matchPercentage.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Central Interactive Scan Area */}
      <div className="relative flex-1 bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 border border-slate-800">
        {/* Glowing Touch Pad */}
        <div
          onClick={onScanFingerprint}
          className={`relative group cursor-pointer w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
            isPassed
              ? 'bg-emerald-950/40 border-2 border-emerald-400'
              : isFailed
              ? 'bg-red-950/40 border-2 border-red-400'
              : isActiveScanning
              ? 'bg-cyan-950/40 border-2 border-cyan-400 animate-pulse'
              : 'bg-slate-900 border-2 border-slate-700 hover:border-cyan-400'
          }`}
        >
          {/* Animated rings */}
          {isActiveScanning && (
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-spin-slow" />
          )}

          <Fingerprint
            className={`w-20 h-20 md:w-24 md:h-24 transition-all ${
              isPassed
                ? 'text-emerald-400 drop-shadow-[0_0_12px_#34D399]'
                : isFailed
                ? 'text-red-400 drop-shadow-[0_0_12px_#EF4444]'
                : isActiveScanning
                ? 'text-cyan-400 drop-shadow-[0_0_15px_#22D3EE]'
                : 'text-slate-400 group-hover:text-cyan-400'
            }`}
          />
        </div>

        {/* Status Callout / Identified Details */}
        <div className="mt-4 text-center">
          {isPassed && identifiedStudent ? (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400 font-orbitron font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>STUDENT VERIFIED</span>
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white">
                {identifiedStudent.name}
              </h3>
              <p className="font-mono text-xs text-slate-300">
                {identifiedStudent.suid} • {identifiedStudent.standard || 'Std 10-A'}
              </p>
            </div>
          ) : isFailed ? (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 border border-red-500 text-red-400 font-orbitron font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>BIOMETRIC MISMATCH</span>
              </div>
              <p className="font-mono text-xs text-red-300">Fingerprint not recognized</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-orbitron font-bold text-xs text-slate-300 tracking-wider">
                {isActiveScanning ? 'SCANNING FINGERPRINT...' : 'PLACE FINGER ON SCANNER'}
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Mantra MFS 100 Optical Fingerprint Sensor
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onScanFingerprint}
          disabled={isActiveScanning}
          className={`flex-1 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
            isPassed
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50'
              : 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black shadow-cyan-500/20'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>{isActiveScanning ? 'SCANNING...' : isPassed ? 'SCAN AGAIN' : 'SCAN FINGERPRINT'}</span>
        </button>

        <button
          onClick={onSimulateFingerprint}
          className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all"
          title="Simulate Fingerprint Match for testing"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </button>
      </div>
    </div>
  );
};

export default FingerprintVerificationCard;
