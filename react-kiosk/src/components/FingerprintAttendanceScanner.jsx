import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Users,
  Activity,
  Calendar,
  Layers,
  RefreshCw,
  Cpu,
  Wifi,
  WifiOff,
  UserPlus,
} from 'lucide-react';
import {
  checkMfs100Service,
  captureFingerprintFromDevice,
  identifyStudentFromFingerprint,
  generateSimulatedFingerprint,
  playBiometricSound,
} from '../services/mantraMfs100';
import {
  fetchRegisteredStudents,
  recordAttendance,
  fetchAttendanceRecords,
} from '../services/supabaseClient';

export const FingerprintAttendanceScanner = ({ onOpenRegisterModal }) => {
  // Device & scanner state
  const [deviceStatus, setDeviceStatus] = useState({
    online: false,
    port: null,
    scannerConnected: false,
  });
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Registered students pool
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [allStudentsCount, setAllStudentsCount] = useState(0);
  const [studentsSource, setStudentsSource] = useState('loading');

  // Scanner status telemetry
  const [scannerStatus, setScannerStatus] = useState('READY'); // READY, SCANNING, MATCHED, UNKNOWN, ERROR
  const [statusMessage, setStatusMessage] = useState('Connecting to Mantra MFS 100 Client Service...');
  const [lastScanMetrics, setLastScanMetrics] = useState(null);

  // Instant Feedback Card
  const [latestVerifiedStudent, setLatestVerifiedStudent] = useState(null);
  const feedbackTimerRef = useRef(null);

  // Recent attendance punch-in records
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Auto-scan loop control
  const autoScanActiveRef = useRef(false);
  const cooldownRef = useRef(false);

  // Check Mantra service and load registered students
  const checkDevice = useCallback(async () => {
    setIsCheckingDevice(true);
    const status = await checkMfs100Service();
    setDeviceStatus(status);
    setIsCheckingDevice(false);

    if (status.online) {
      setStatusMessage(`Mantra MFS 100 Service Connected on Port ${status.port}. Ready to scan.`);
    } else {
      setStatusMessage('Mantra MFS 100 Service Offline. Plug in device or click "Test Scan" to simulate.');
    }
  }, []);

  const loadStudentsAndLogs = useCallback(async () => {
    const { allStudents, enrolledStudents: enrolled, source } = await fetchRegisteredStudents();
    setAllStudentsCount(allStudents.length);
    setEnrolledStudents(enrolled);
    setStudentsSource(source);

    const logs = await fetchAttendanceRecords();
    setAttendanceLogs(logs);
  }, []);

  useEffect(() => {
    checkDevice();
    loadStudentsAndLogs();
  }, [checkDevice, loadStudentsAndLogs]);

  // Handle successful match and attendance logging
  const handleSuccessfulMatch = useCallback(
    async (student, score = 1500, quality = 80, capturedImage = null) => {
      if (soundEnabled) playBiometricSound('success');

      setScannerStatus('MATCHED');
      setStatusMessage(`VERIFIED: ${student.name.toUpperCase()} (${student.suid})`);
      setLastScanMetrics({
        name: student.name,
        suid: student.suid,
        score,
        quality,
        time: new Date().toLocaleTimeString(),
        image: capturedImage || student.fingerprintImage,
      });

      setLatestVerifiedStudent(student);

      // Record in Supabase
      await recordAttendance({
        student,
        score,
        confidence: Math.min(99.9, (score / 1800) * 100),
        method: 'fingerprint',
      });

      // Refresh recent logs
      const updatedLogs = await fetchAttendanceRecords();
      setAttendanceLogs(updatedLogs);

      // Clear feedback banner after 6 seconds
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setLatestVerifiedStudent(null);
        setScannerStatus('READY');
        setStatusMessage('Ready for next student. Place finger on scanner.');
      }, 5000);
    },
    [soundEnabled]
  );

  // Trigger live capture on physical Mantra MFS 100
  const triggerCapture = useCallback(async () => {
    if (isScanning || cooldownRef.current) return;

    setIsScanning(true);
    setScannerStatus('SCANNING');
    setStatusMessage('Place your finger firmly on Mantra MFS 100 optical sensor...');
    if (soundEnabled) playBiometricSound('scan');

    try {
      const captureResult = await captureFingerprintFromDevice({ quality: 60, timeout: 10 });

      if (!captureResult.success) {
        if (soundEnabled) playBiometricSound('error');
        setScannerStatus('ERROR');
        setStatusMessage(captureResult.error || 'Capture timed out or aborted.');
        setIsScanning(false);
        return;
      }

      setStatusMessage(`Fingerprint captured (Quality: ${captureResult.quality}%). Identifying student...`);

      // Match against enrolled pool
      const identifyResult = await identifyStudentFromFingerprint(
        captureResult.isoTemplate,
        enrolledStudents
      );

      if (identifyResult.matched && identifyResult.student) {
        await handleSuccessfulMatch(
          identifyResult.student,
          identifyResult.score,
          captureResult.quality,
          captureResult.bitmapData
        );
      } else {
        if (soundEnabled) playBiometricSound('error');
        setScannerStatus('UNKNOWN');
        setStatusMessage('Fingerprint not registered in student database!');
        setTimeout(() => {
          setScannerStatus('READY');
          setStatusMessage('Ready. Place finger on scanner to punch attendance.');
        }, 3000);
      }
    } catch (err) {
      setScannerStatus('ERROR');
      setStatusMessage('Communication error with Mantra service.');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, soundEnabled, enrolledStudents, handleSuccessfulMatch]);

  // Simulation Trigger for testing without physical scanner
  const triggerSimulatedScan = useCallback(async (targetStudent = null) => {
    if (isScanning) return;
    setIsScanning(true);
    setScannerStatus('SCANNING');
    setStatusMessage('SIMULATING MANTRA MFS 100 FINGERPRINT SCAN...');
    if (soundEnabled) playBiometricSound('scan');

    setTimeout(async () => {
      // Pick student
      const studentToMatch =
        targetStudent ||
        (enrolledStudents.length > 0
          ? enrolledStudents[Math.floor(Math.random() * enrolledStudents.length)]
          : null);

      if (studentToMatch) {
        const sim = generateSimulatedFingerprint(studentToMatch);
        await handleSuccessfulMatch(studentToMatch, 1750, sim.quality, null);
      } else {
        if (soundEnabled) playBiometricSound('error');
        setScannerStatus('UNKNOWN');
        setStatusMessage('No enrolled students found. Click "ENROLL FINGERPRINT" first!');
        setTimeout(() => setScannerStatus('READY'), 3000);
      }
      setIsScanning(false);
    }, 700);
  }, [isScanning, soundEnabled, enrolledStudents, handleSuccessfulMatch]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Top Telemetry & Control Bar */}
      <div className="cyber-card p-3 flex flex-wrap items-center justify-between gap-3 border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              deviceStatus.online
                ? 'bg-emerald-400 shadow-[0_0_10px_#34D399] animate-pulse'
                : 'bg-amber-400 shadow-[0_0_10px_#FBBF24]'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold text-xs tracking-wider text-cyan-400">
                MANTRA MFS 100 SENSOR
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  deviceStatus.online
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                }`}
              >
                {deviceStatus.online ? `ONLINE (PORT ${deviceStatus.port})` : 'SERVICE DISCONNECTED'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">{statusMessage}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              soundEnabled
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Scanner Connection */}
          <button
            onClick={checkDevice}
            disabled={isCheckingDevice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-mono transition-all"
            title="Check Mantra MFS 100 Driver Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDevice ? 'animate-spin' : ''}`} />
            <span>CHECK DEVICE</span>
          </button>

          {/* Quick Simulation Button */}
          <button
            onClick={() => triggerSimulatedScan()}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/50 text-indigo-300 hover:text-white text-xs font-mono transition-all shadow"
            title="Test attendance flow without physical scanner"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TEST SCAN</span>
          </button>
        </div>
      </div>

      {/* Main Attendance Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Interactive Biometric Scanner Touch Pad (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div
            className={`cyber-card p-6 flex flex-col items-center justify-between flex-1 relative overflow-hidden border-2 transition-all ${
              scannerStatus === 'MATCHED'
                ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                : scannerStatus === 'ERROR' || scannerStatus === 'UNKNOWN'
                ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                : isScanning
                ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                : 'border-slate-800'
            }`}
          >
            {/* Scanner Status Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 font-orbitron text-xs">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-bold">BIOMETRIC ATTENDANCE KIOSK</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">Enrolled:</span>
                <span className="text-emerald-400 font-bold">
                  {enrolledStudents.length} / {allStudentsCount} Students
                </span>
              </div>
            </div>

            {/* Central Glowing Fingerprint Touch Zone */}
            <div className="my-auto py-6 flex flex-col items-center justify-center">
              <div
                onClick={deviceStatus.online ? triggerCapture : () => triggerSimulatedScan()}
                className={`relative group cursor-pointer w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
                  isScanning
                    ? 'bg-cyan-950/40'
                    : scannerStatus === 'MATCHED'
                    ? 'bg-emerald-950/40'
                    : 'bg-slate-900/80 hover:bg-slate-800/80'
                }`}
              >
                {/* Outer Rotating Glowing Ring */}
                <div
                  className={`absolute inset-0 rounded-full border-2 border-dashed transition-all ${
                    isScanning
                      ? 'border-cyan-400 animate-spin-slow'
                      : scannerStatus === 'MATCHED'
                      ? 'border-emerald-400'
                      : 'border-slate-700 group-hover:border-cyan-500'
                  }`}
                />

                {/* Inner Pulsing Radar Glow */}
                <div
                  className={`absolute inset-3 rounded-full transition-opacity ${
                    isScanning
                      ? 'bg-cyan-500/20 animate-ping'
                      : scannerStatus === 'MATCHED'
                      ? 'bg-emerald-500/20'
                      : 'opacity-0 group-hover:opacity-100 bg-cyan-500/10'
                  }`}
                />

                {/* Vertical Laser Scan Beam Animation */}
                {isScanning && (
                  <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22D3EE] animate-bounce" />
                )}

                {/* Center Fingerprint Graphic or Scanned Bitmap */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <Fingerprint
                    className={`w-28 h-28 md:w-32 md:h-32 transition-all ${
                      scannerStatus === 'MATCHED'
                        ? 'text-emerald-400 drop-shadow-[0_0_15px_#34D399]'
                        : scannerStatus === 'ERROR' || scannerStatus === 'UNKNOWN'
                        ? 'text-red-400 drop-shadow-[0_0_15px_#EF4444]'
                        : isScanning
                        ? 'text-cyan-400 drop-shadow-[0_0_20px_#22D3EE] animate-pulse'
                        : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                </div>
              </div>

              {/* Action Callout */}
              <div className="mt-4 text-center">
                <button
                  onClick={deviceStatus.online ? triggerCapture : () => triggerSimulatedScan()}
                  disabled={isScanning}
                  className={`px-8 py-2.5 rounded-xl font-orbitron font-bold text-sm tracking-wider uppercase transition-all shadow-lg active:scale-95 ${
                    isScanning
                      ? 'bg-cyan-600 text-black animate-pulse cursor-wait'
                      : scannerStatus === 'MATCHED'
                      ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black shadow-cyan-500/30'
                  }`}
                >
                  {isScanning
                    ? 'SCANNING FINGERPRINT...'
                    : scannerStatus === 'MATCHED'
                    ? 'TAP TO SCAN NEXT'
                    : 'TAP TO SCAN FINGERPRINT'}
                </button>
                <p className="mt-2 text-xs font-mono text-slate-400">
                  {deviceStatus.online
                    ? 'Place finger on Mantra MFS 100 scanner and press button'
                    : 'Mantra Service is offline. Click button to test simulated scan.'}
                </p>
              </div>
            </div>

            {/* Instant Verified Student Display Card */}
            {latestVerifiedStudent && (
              <div className="w-full bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900/60 border border-emerald-400 flex items-center justify-center font-orbitron font-bold text-emerald-400 text-lg">
                    {latestVerifiedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-orbitron font-bold text-[10px]">
                        ATTENDANCE MARKED
                      </span>
                      <span className="font-mono text-xs text-emerald-300">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <h3 className="font-orbitron font-bold text-base text-white mt-0.5">
                      {latestVerifiedStudent.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-emerald-200/90 mt-0.5">
                      <span>Roll/SUID: {latestVerifiedStudent.suid}</span>
                      <span>•</span>
                      <span>Class: {latestVerifiedStudent.standard}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest">
                    MANTRA MFS 100
                  </div>
                  <div className="text-emerald-300 font-bold text-sm">
                    MATCH SCORE: {lastScanMetrics?.score || 1600}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Roster Feed & Stats (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="cyber-card p-3 border-slate-800 bg-slate-950 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Today's Punches</div>
                <div className="font-orbitron font-bold text-lg text-emerald-400">
                  {attendanceLogs.length}
                </div>
              </div>
            </div>

            <div className="cyber-card p-3 border-slate-800 bg-slate-950 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Enrolled Ratio</div>
                <div className="font-orbitron font-bold text-lg text-cyan-400">
                  {allStudentsCount > 0
                    ? `${Math.round((enrolledStudents.length / allStudentsCount) * 100)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Attendance History Feed */}
          <div className="cyber-card p-4 flex flex-col flex-1 border-slate-800 bg-slate-950 min-h-[380px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-orbitron text-xs text-cyan-400">
                <Activity className="w-4 h-4" />
                <span className="font-bold">LIVE ATTENDANCE FEED</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">MANTRA MFS 100 PUNCHES</span>
            </div>

            {/* Attendance Logs List */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 max-h-[350px]">
              {attendanceLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs">
                  <Clock className="w-8 h-8 mb-2 text-slate-600" />
                  <p>No attendance punches recorded yet today.</p>
                  <p className="text-[10px] mt-1">Tap the fingerprint sensor to punch in.</p>
                </div>
              ) : (
                attendanceLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 flex items-center justify-between font-mono text-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{log.student_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {log.suid} • {log.standard}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">{log.time || 'Present'}</div>
                      <div className="text-[10px] text-slate-500">
                        {log.method === 'fingerprint' ? 'Mantra MFS100' : log.method || 'Biometric'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Help Note */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Missing students?</span>
              <button
                onClick={onOpenRegisterModal}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enroll Fingerprint</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintAttendanceScanner;
