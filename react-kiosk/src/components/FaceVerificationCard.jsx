import React from 'react';
import { Camera, CameraOff, CheckCircle2, AlertTriangle, Scan, Shield } from 'lucide-react';
import { KioskStep } from '../hooks/useKioskState';

export const FaceVerificationCard = ({
  videoRef,
  isCameraActive,
  cameraError,
  step,
  identifiedStudent,
  matchPercentage,
  onStartCamera,
  onStopCamera,
  onScanFace,
}) => {
  const isScanning = step === KioskStep.SCANNING_FACE;
  const isPassed = step === KioskStep.AWAITING_NFC || step === KioskStep.FULLY_VERIFIED;
  const isFailed = step === KioskStep.MISMATCH;

  return (
    <div className={`cyber-card p-4 flex flex-col justify-between h-full border-2 ${
      isPassed ? 'border-emerald-500 cyber-glow-green' : isFailed ? 'border-red-500 cyber-glow-red' : isCameraActive ? 'border-cyan-500 cyber-glow-cyan' : 'border-slate-800'
    }`}>
      {/* Step 1 Title Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-400">
            STEP 1: WEBRTC LIVE FACE BIOMETRIC SCAN
          </h2>
        </div>
        {matchPercentage > 0 && (
          <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-mono font-bold text-xs">
            MATCH: {matchPercentage.toFixed(1)}%
          </div>
        )}
      </div>

      {/* WebRTC Video Camera Preview Container */}
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] border border-slate-800">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transform -scale-x-100 ${!isCameraActive && 'hidden'}`}
          playsInline
          muted
        />

        {/* Overlay when Camera is OFF */}
        {!isCameraActive && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <CameraOff className="w-16 h-16 mb-3 text-slate-600 animate-pulse-slow" />
            <p className="font-orbitron font-bold text-sm text-slate-400 mb-1">CAMERA FEED IDLE</p>
            <p className="text-xs">Click "START SCANNING FACE" to activate WebRTC stream</p>
          </div>
        )}

        {/* Scanner Target Box & Oval Oval Mask when Active */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Oval Face Guide */}
            <div className={`w-56 h-72 rounded-[50%] border-2 transition-all duration-500 ${
              isPassed ? 'border-emerald-400 shadow-[0_0_30px_#10B981]' : isFailed ? 'border-red-500 shadow-[0_0_30px_#EF4444]' : 'border-cyan-400/80 shadow-[0_0_20px_#06B6D4]'
            }`}>
              {/* Radar Scanning Line */}
              {isScanning && (
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce mt-10" />
              )}
            </div>
          </div>
        )}

        {/* Status Overlays: Verified / Failed */}
        {isPassed && identifiedStudent && (
          <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-emerald-950/90 border border-emerald-500/80 backdrop-blur-md flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-orbitron font-bold text-emerald-400 text-sm">
                FACE VERIFIED: {identifiedStudent.name.toUpperCase()}
              </div>
              <div className="font-mono text-xs text-emerald-200">
                SUID: {identifiedStudent.suid} | NFC: {identifiedStudent.nfcCode}
              </div>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute top-4 left-4 right-4 p-3 rounded-lg bg-red-950/90 border border-red-500 flex items-center gap-2 text-red-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mt-4 flex gap-3">
        {!isCameraActive ? (
          <button
            onClick={() => {
              onStartCamera();
              setTimeout(() => onScanFace(), 1200);
            }}
            className="flex-1 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-orbitron font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>START SCANNING FACE</span>
          </button>
        ) : (
          <>
            <button
              onClick={onScanFace}
              disabled={isScanning}
              className="flex-1 py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-orbitron font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Scan className="w-4 h-4" />
              <span>{isScanning ? 'ANALYZING BIOMETRICS...' : 'CAPTURE & MATCH FACE'}</span>
            </button>
            <button
              onClick={onStopCamera}
              className="py-3 px-4 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-orbitron font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <CameraOff className="w-4 h-4" />
              <span>STOP CAMERA</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
