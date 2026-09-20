import React, { useState } from 'react';
import { Lock, ShieldCheck, Printer, Check, ShoppingBag, Scissors, Tag } from 'lucide-react';
import { KioskStep } from '../hooks/useKioskState';

const SAMPLE_SERVICES = [
  { id: '1', name: 'Store Purchase', amounts: [10, 20, 50, 100], icon: ShoppingBag },
  { id: '2', name: 'Hair Cutting', amounts: [30, 50], icon: Scissors },
  { id: '3', name: 'Harish Jayanti', amounts: [10, 20, 50, 100, 200], icon: Tag },
];

export const ServiceOptionsGrid = ({ step, verifiedStudent, onExecutePayment }) => {
  const [selectedService, setSelectedService] = useState(SAMPLE_SERVICES[0]);
  const [amount, setAmount] = useState(50);
  const isUnlocked = step === KioskStep.FULLY_VERIFIED;

  const handleSubmit = () => {
    if (!isUnlocked || !verifiedStudent || amount <= 0) return;
    onExecutePayment({
      serviceName: selectedService.name,
      amount,
      student: verifiedStudent,
    });
  };

  return (
    <div className={`cyber-card p-5 flex flex-col justify-between h-full border-2 transition-all duration-300 ${
      isUnlocked ? 'border-emerald-500 cyber-glow-green' : 'border-slate-800 opacity-60'
    }`}>
      {/* Step 3 Title */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <Lock className="w-5 h-5 text-slate-500" />
          )}
          <h2 className={`font-orbitron font-bold text-sm tracking-wide ${isUnlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
            STEP 3: UNLOCKED SERVICE & POS OPTIONS
          </h2>
        </div>
        {isUnlocked && (
          <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-mono text-xs font-bold">
            DUAL VERIFIED ✓
          </span>
        )}
      </div>

      {/* Main Panel Content */}
      {isUnlocked && verifiedStudent ? (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Authenticated Student Banner */}
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="font-orbitron font-bold text-xs text-emerald-400">
                AUTHENTICATED: {verifiedStudent.name.toUpperCase()}
              </p>
              <p className="font-mono text-[11px] text-slate-300">
                SUID: {verifiedStudent.suid} | NFC: {verifiedStudent.nfcCode}
              </p>
            </div>
          </div>

          {/* Service Selection List */}
          <div className="space-y-2">
            <label className="font-orbitron font-bold text-xs text-slate-300">
              SELECT KIOSK SERVICE:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {SAMPLE_SERVICES.map((srv) => {
                const IconComp = srv.icon;
                const isSelected = selectedService.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      setSelectedService(srv);
                      setAmount(srv.amounts[0]);
                    }}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <IconComp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="font-orbitron text-xs truncate">{srv.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Keypad */}
          <div className="space-y-2">
            <label className="font-orbitron font-bold text-xs text-slate-300">
              SELECT AMOUNT (INR):
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedService.amounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-4 py-2 rounded-lg font-orbitron font-bold text-xs transition-all ${
                    amount === amt
                      ? 'bg-emerald-500 text-black shadow-[0_0_12px_#10B981]'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-orbitron font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.99]"
          >
            <Printer className="w-5 h-5" />
            <span>SUBMIT PAYMENT & PRINT THERMAL RECEIPT (₹{amount})</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
          <Lock className="w-16 h-16 text-slate-600 animate-pulse-slow" />
          <h3 className="font-orbitron font-bold text-sm text-slate-400">
            SERVICE OPTIONS LOCKED
          </h3>
          <p className="text-xs max-w-md">
            Face Scan (Step 1) + NFC Card Match (Step 2) required to unlock service options.
          </p>
        </div>
      )}
    </div>
  );
};
