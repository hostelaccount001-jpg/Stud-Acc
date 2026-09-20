import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Phone,
  BookOpen,
  Hash,
  User,
} from 'lucide-react';
import {
  checkMfs100Service,
  captureFingerprintFromDevice,
  generateSimulatedFingerprint,
  playBiometricSound,
} from '../services/mantraMfs100';
import { saveStudentFingerprint } from '../services/supabaseClient';

export const FingerprintRegistrationModal = ({
  isOpen,
  onClose,
  existingStudents = [],
  onStudentSaved,
}) => {
  // Mode: 'new' or 'existing'
  const [mode, setMode] = useState('new');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [suid, setSuid] = useState('');
  const [standard, setStandard] = useState('Std 10-A');
  const [nfcCode, setNfcCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Mantra MFS 100 capture state
  const [deviceStatus, setDeviceStatus] = useState({ online: false, port: null });
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedData, setCapturedData] = useState(null); // { isoTemplate, quality, nfiq, bitmapData }
  const [captureError, setCaptureError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Proactively check device when modal opens
  useEffect(() => {
    if (isOpen) {
      checkDevice();
      resetForm();
    }
  }, [isOpen]);

  const checkDevice = async () => {
    const status = await checkMfs100Service();
    setDeviceStatus(status);
  };

  const resetForm = () => {
    setMode('new');
    setSelectedStudentId('');
    setStudentName('');
    setSuid(`STU-${Math.floor(1000 + Math.random() * 9000)}`);
    setStandard('Std 10-A');
    setNfcCode(`NFC-${Math.floor(100000 + Math.random() * 900000)}`);
    setMobileNumber('');
    setCapturedData(null);
    setCaptureError('');
    setSaveSuccess(false);
  };

  // Sync selected existing student
  useEffect(() => {
    if (mode === 'existing' && selectedStudentId) {
      const found = existingStudents.find((s) => s.id === selectedStudentId);
      if (found) {
        setStudentName(found.name || '');
        setSuid(found.suid || '');
        setStandard(found.standard || 'Std 10-A');
        setNfcCode(found.nfcCode || '');
        setMobileNumber(found.mobileNumber || '');
        if (found.fingerprintTemplate) {
          setCapturedData({
            isoTemplate: found.fingerprintTemplate,
            quality: 85,
            nfiq: 1,
            bitmapData: found.fingerprintImage || null,
          });
        } else {
          setCapturedData(null);
        }
      }
    }
  }, [selectedStudentId, mode, existingStudents]);

  // Capture from physical device
  const handleCaptureFromDevice = async () => {
    setIsCapturing(true);
    setCaptureError('');
    playBiometricSound('scan');

    const result = await captureFingerprintFromDevice({ quality: 60, timeout: 10 });

    if (result.success) {
      playBiometricSound('success');
      setCapturedData({
        isoTemplate: result.isoTemplate,
        quality: result.quality,
        nfiq: result.nfiq,
        bitmapData: result.bitmapData,
      });
    } else {
      playBiometricSound('error');
      setCaptureError(
        result.error ||
          'Failed to capture from Mantra scanner. Check if USB is plugged in and service is running.'
      );
    }
    setIsCapturing(false);
  };

  // Simulator for quick testing
  const handleSimulateCapture = () => {
    setIsCapturing(true);
    playBiometricSound('scan');

    setTimeout(() => {
      const sim = generateSimulatedFingerprint({ suid, name: studentName });
      playBiometricSound('success');
      setCapturedData({
        isoTemplate: sim.isoTemplate,
        quality: sim.quality,
        nfiq: sim.nfiq,
        bitmapData: null,
      });
      setIsCapturing(false);
    }, 600);
  };

  // Submit and save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setCaptureError('Student name is required.');
      return;
    }
    if (!capturedData?.isoTemplate) {
      setCaptureError('Please capture or simulate a fingerprint before saving.');
      return;
    }

    setIsSaving(true);
    setCaptureError('');

    try {
      const res = await saveStudentFingerprint({
        studentId: mode === 'existing' ? selectedStudentId : null,
        isoTemplate: capturedData.isoTemplate,
        fingerprintImage: capturedData.bitmapData,
        studentName: studentName.trim(),
        suid: suid.trim(),
        standard: standard.trim(),
        nfcCode: nfcCode.trim(),
        mobileNumber: mobileNumber.trim(),
      });

      if (res.success) {
        setSaveSuccess(true);
        playBiometricSound('success');
        if (onStudentSaved) onStudentSaved(res.student);

        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setCaptureError('Failed to save student biometrics: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="cyber-card w-full max-w-2xl bg-slate-950 border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-base text-white tracking-wide">
                ENROLL STUDENT FINGERPRINT
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Mantra MFS 100 Optical Biometric Registration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('new');
                resetForm();
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                mode === 'new'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + REGISTER NEW STUDENT
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                mode === 'existing'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              UPDATE EXISTING STUDENT
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {mode === 'existing' && (
              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-400 font-medium">Select Existing Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">-- Choose Student to Enroll --</option>
                  {existingStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.suid}) {s.fingerprintTemplate ? '✓ Has Fingerprint' : '⚠️ Pending'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>Roll / Student UID (SUID) *</span>
              </label>
              <input
                type="text"
                value={suid}
                onChange={(e) => setSuid(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Standard / Class</span>
              </label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="Std 8-A">Std 8-A</option>
                <option value="Std 9-A">Std 9-A</option>
                <option value="Std 10-A">Std 10-A</option>
                <option value="Std 11-Science">Std 11-Science</option>
                <option value="Std 12-Commerce">Std 12-Commerce</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                <span>NFC Card Code</span>
              </label>
              <input
                type="text"
                value={nfcCode}
                onChange={(e) => setNfcCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mobile Number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Fingerprint Capture Station */}
          <div className="cyber-card p-4 border-slate-800 bg-slate-900/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron font-bold text-xs text-white">
                  MANTRA MFS 100 SENSOR CAPTURE
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  deviceStatus.online
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                }`}
              >
                {deviceStatus.online ? `DEVICE READY (PORT ${deviceStatus.port})` : 'MANTRA OFFLINE'}
              </span>
            </div>

            {/* Visual Touch Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-all ${
                    capturedData
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                      : isCapturing
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-400 animate-pulse'
                      : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}
                >
                  {capturedData?.bitmapData ? (
                    <img
                      src={capturedData.bitmapData}
                      alt="Fingerprint"
                      className="w-full h-full object-contain p-1 rounded-lg"
                    />
                  ) : (
                    <Fingerprint className="w-12 h-12" />
                  )}
                </div>

                <div>
                  <div className="font-orbitron font-bold text-xs text-white">
                    {capturedData
                      ? 'FINGERPRINT TEMPLATE READY'
                      : isCapturing
                      ? 'READING SCANNER...'
                      : 'AWAITING CAPTURE'}
                  </div>
                  {capturedData ? (
                    <div className="text-[11px] font-mono text-emerald-400 space-y-0.5 mt-1">
                      <div>Quality Score: {capturedData.quality}%</div>
                      <div>Format: ISO 19794-2 FMR Template</div>
                    </div>
                  ) : (
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Click below to capture print from Mantra MFS 100 scanner
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCaptureFromDevice}
                  disabled={isCapturing}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-orbitron font-bold text-xs rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isCapturing ? 'SCANNING...' : 'SCAN ON MANTRA'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateCapture}
                  disabled={isCapturing}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono rounded-lg transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Simulate Capture</span>
                </button>
              </div>
            </div>

            {captureError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{captureError}</span>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Student Biometrics enrolled successfully!</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !capturedData?.isoTemplate}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>SAVE BIOMETRICS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FingerprintRegistrationModal;
