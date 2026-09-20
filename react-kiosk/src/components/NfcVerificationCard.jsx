import React, { useState, useEffect } from 'react';
import { Nfc, Lock, CheckCircle2, ShieldAlert, KeyRound } from 'lucide-react';
import { KioskStep } from '../hooks/useKioskState';

export const NfcVerificationCard = ({
  step,
  identifiedStudent,
  scannedNfcCode,
  onVerifyNfc,
}) => {
  const [inputCode, setInputCode] = useState('');
  const isEnabled = step === KioskStep.AWAITING_NFC || step === KioskStep.FULLY_VERIFIED;
  const isPassed = step === KioskStep.FULLY_VERIFIED;

  // Auto-focus and handle USB HID Keypress wedge
  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e) => {
      if (!isEnabled) return;
      if (e.key === 'Enter') {
        if (buffer.trim()) {
          onVerifyNfc(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, onVerifyNfc]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const codeToUse = inputCode.trim() || (identifiedStudent ? identifiedStudent.nfcCode : '');
    if (codeToUse) {
      onVerifyNfc(codeToUse);
    }
  };

  return (
    <div className={`cyber-card p-4 flex flex-col justify-between border-2 transition-all duration-300 ${
      isEnabled ? 'border-amber-500/80 cyber-glow-amber' : 'border-slate-800 opacity-70'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Nfc className="w-5 h-5 text-amber-400 animate-pulse" />
          ) : (
            <Lock className="w-5 h-5 text-slate-500" />
          )}
          <h2 className={`font-orbitron font-bold text-sm tracking-wide ${isEnabled ? 'text-amber-400' : 'text-slate-500'}`}>
            STEP 2: AUTOMATED NFC CARD VERIFICATION
          </h2>
        </div>
        {isEnabled && (
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-mono text-[10px] font-bold">
            STEP 1 PASSED ✓
          </span>
        )}
      </div>

      {/* Body Content */}
      {isEnabled && identifiedStudent ? (
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/40 space-y-3">
          <div className="flex items-start gap-3">
            <Nfc className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-orbitron font-bold text-xs text-emerald-400">
                STUDENT IDENTIFIED: {identifiedStudent.name} ({identifiedStudent.suid})
              </p>
              <p className="font-mono text-xs text-amber-400 font-bold">
                REGISTERED NFC CODE: {identifiedStudent.nfcCode}
              </p>
            </div>
          </div>

          {/* Form / Manual Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Tap physical NFC card or type code..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder:text-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-orbitron font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>VERIFY NFC</span>
            </button>
          </form>

          {/* Quick Test Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setInputCode(identifiedStudent.nfcCode);
                onVerifyNfc(identifiedStudent.nfcCode);
              }}
              className="px-2.5 py-1 rounded border border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 font-orbitron text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>TEST MATCH ({identifiedStudent.nfcCode})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode('NFC-WRONG-99');
                onVerifyNfc('NFC-WRONG-99');
              }}
              className="px-2.5 py-1 rounded border border-red-500/60 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-orbitron text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>TEST MISMATCH (NFC-WRONG)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center text-slate-500 font-sans text-xs">
          Face Scan (Step 1) must be active and verified before NFC Card verification.
        </div>
      )}
    </div>
  );
};
