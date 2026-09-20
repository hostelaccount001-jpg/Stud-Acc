import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Shield,
  Sparkles,
  Volume2,
  Users,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  faceapi,
  loadFaceApiModels,
  detectSingleFaceWithDescriptor,
  calculateEuclideanDistance,
  playSuccessChime,
} from '../services/faceModelLoader';
import {
  fetchRegisteredStudents,
  recordAttendance,
  fetchAttendanceRecords,
} from '../services/supabaseClient';

export const FaceAttendanceScanner = ({ onOpenRegisterModal }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // In-memory Map of studentId -> lastScannedTimestamp (5-second debounce cooldown)
  const lastScannedMapRef = useRef(new Map());

  // Component State
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Registered students pool
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [allStudentsCount, setAllStudentsCount] = useState(0);
  const [studentsSource, setStudentsSource] = useState('loading');

  // Scanner status telemetry
  const [scannerStatus, setScannerStatus] = useState('INITIALIZING'); // SCANNING, MATCHED, COOLDOWN, UNKNOWN, NO_FACE
  const [statusMessage, setStatusMessage] = useState('Initializing AI Face Recognition Engine...');
  const [currentDetectionMetrics, setCurrentDetectionMetrics] = useState(null);

  // Instant Feedback Popup / Card
  const [latestVerifiedStudent, setLatestVerifiedStudent] = useState(null);
  const [feedbackTimeout, setFeedbackTimeout] = useState(null);

  // Recent attendance punch-in records
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Load models and fetch students with encodings on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsModelLoading(true);
        setStatusMessage('Loading TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet from /models...');
        await loadFaceApiModels();

        if (!isMounted) return;
        setIsModelLoading(false);
        setStatusMessage('AI Models Ready. Fetching registered students...');

        // Fetch students who have face encodings
        const { allStudents, enrolledStudents: enrolled, source } = await fetchRegisteredStudents();
        if (isMounted) {
          setAllStudentsCount(allStudents.length);
          setEnrolledStudents(enrolled);
          setStudentsSource(source);
          setStatusMessage(
            `Loaded ${enrolled.length} enrolled student face vectors (${source.toUpperCase()}). Starting camera...`
          );
        }

        // Fetch recent logs
        const logs = await fetchAttendanceRecords();
        if (isMounted) {
          setAttendanceLogs(logs);
        }

        // Start camera automatically
        await startCamera();
      } catch (err) {
        console.error('[Scanner Init Error]', err);
        if (isMounted) {
          setModelError('Failed to load Face-API models. Check /models folder.');
          setIsModelLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // Reload registered students
  const refreshStudents = async () => {
    const { allStudents, enrolledStudents: enrolled, source } = await fetchRegisteredStudents();
    setAllStudentsCount(allStudents.length);
    setEnrolledStudents(enrolled);
    setStudentsSource(source);
    const logs = await fetchAttendanceRecords();
    setAttendanceLogs(logs);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      // 480x360 or 640x480 resolution for high performance
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 480 },
          height: { ideal: 480, min: 360 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
          startRecognitionLoop();
        };
      }
    } catch (err) {
      console.error('[Webcam Start Error]', err);
      setCameraError('Camera access denied or video device unavailable.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  /**
   * Module B Recognition Loop: Runs every 700ms
   */
  const startRecognitionLoop = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    scanTimerRef.current = setInterval(async () => {
      if (isProcessingRef.current) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const displaySize = {
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      };
      faceapi.matchDimensions(canvas, displaySize);

      isProcessingRef.current = true;

      try {
        // Run detectSingleFace with landmarks & 128-D descriptor
        const detection = await detectSingleFaceWithDescriptor(video);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!detection) {
          setScannerStatus('NO_FACE');
          setStatusMessage('Looking for face... Align with the scanning frame.');
          setCurrentDetectionMetrics(null);
          isProcessingRef.current = false;
          return;
        }

        const liveDescriptor = Array.from(detection.descriptor); // 128-D Float array
        const resized = faceapi.resizeResults(detection, displaySize);

        // Compare against all registered student encodings using Euclidean Distance
        let bestMatch = null;
        let minDistance = 1.0;

        for (const st of enrolledStudents) {
          if (Array.isArray(st.faceEncoding) && st.faceEncoding.length > 0) {
            const dist = calculateEuclideanDistance(liveDescriptor, st.faceEncoding);
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = { student: st, distance: dist };
            }
          }
        }

        const confidence = Math.max(0, (1 - minDistance) * 100);
        setCurrentDetectionMetrics({
          distance: minDistance,
          confidence: confidence,
          candidateName: bestMatch?.student?.name || 'Unknown',
        });

        // Check Threshold: Distance < 0.5 is a VALID MATCH!
        const THRESHOLD = 0.5;

        if (bestMatch && bestMatch.distance < THRESHOLD) {
          const student = bestMatch.student;
          const studentId = student.id;
          const now = Date.now();
          const lastScanned = lastScannedMapRef.current.get(studentId) || 0;
          const timeSinceLast = now - lastScanned;

          // Draw Bounding Box (Emerald Green for verified)
          const box = resized.detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, {
            label: `${student.name.toUpperCase()} (${confidence.toFixed(1)}%)`,
            boxColor: '#10B981',
            lineWidth: 3,
          });
          drawBox.draw(canvas);

          // 5-Second Debounce Cooldown: Ignore if scanned within 5000ms
          if (timeSinceLast < 5000) {
            setScannerStatus('COOLDOWN');
            const secondsLeft = Math.ceil((5000 - timeSinceLast) / 1000);
            setStatusMessage(`COOLDOWN: ${student.name} marked present just now. Next scan in ${secondsLeft}s.`);
            isProcessingRef.current = false;
            return;
          }

          // Outside cooldown -> Record attendance & play chime!
          lastScannedMapRef.current.set(studentId, now);
          setScannerStatus('MATCHED');
          setStatusMessage(`VERIFIED: ${student.name} (${student.suid})! Attendance recorded.`);

          // Play high-tech attendance chime
          playSuccessChime();

          // Snapshot thumbnail
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = video.videoWidth || 640;
          snapCanvas.height = video.videoHeight || 480;
          const sCtx = snapCanvas.getContext('2d');
          sCtx.translate(snapCanvas.width, 0);
          sCtx.scale(-1, 1);
          sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
          const snapshotBase64 = snapCanvas.toDataURL('image/jpeg', 0.8);

          // Insert attendance record into Supabase
          const recordRes = await recordAttendance({
            student,
            distance: bestMatch.distance,
            confidence: confidence,
            snapshotBase64,
          });

          // Show instant feedback popup
          const feedbackObj = {
            student,
            distance: bestMatch.distance,
            confidence: confidence,
            time: new Date().toLocaleTimeString(),
            date: new Date().toLocaleDateString(),
            photo: snapshotBase64 || student.photoUrl,
            dbSaved: recordRes.dbSaved,
          };
          setLatestVerifiedStudent(feedbackObj);

          // Update local attendance logs feed
          setAttendanceLogs((prev) => [recordRes.record, ...prev.slice(0, 49)]);

          // Keep popup visible for 4.5 seconds
          if (feedbackTimeout) clearTimeout(feedbackTimeout);
          const tId = setTimeout(() => {
            setLatestVerifiedStudent(null);
          }, 4500);
          setFeedbackTimeout(tId);
        } else {
          // Distance >= 0.5 (Unrecognized face)
          setScannerStatus('UNKNOWN');
          setStatusMessage('Face detected, but not recognized in database (Distance > 0.5).');

          const box = resized.detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, {
            label: `UNRECOGNIZED (${confidence.toFixed(0)}%)`,
            boxColor: '#EF4444',
            lineWidth: 2,
          });
          drawBox.draw(canvas);
        }
      } catch (loopErr) {
        // cycle error ignore
      } finally {
        isProcessingRef.current = false;
      }
    }, 700); // Exact 700ms interval as specified in prompt
  }, [enrolledStudents, feedbackTimeout]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Telemetry Status Bar */}
      <div className="cyber-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              scannerStatus === 'MATCHED'
                ? 'bg-emerald-400'
                : scannerStatus === 'COOLDOWN'
                ? 'bg-amber-400'
                : scannerStatus === 'UNKNOWN'
                ? 'bg-red-400'
                : 'bg-cyan-400'
            }`}
          />
          <span
            className={`font-bold ${
              scannerStatus === 'MATCHED'
                ? 'text-emerald-400'
                : scannerStatus === 'COOLDOWN'
                ? 'text-amber-400'
                : scannerStatus === 'UNKNOWN'
                ? 'text-red-400'
                : 'text-cyan-300'
            }`}
          >
            {statusMessage}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Enrolled Faces:{' '}
              <strong className="text-cyan-400">{enrolledStudents.length}</strong> / {allStudentsCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Loop: 700ms</span>
          </div>

          <button
            onClick={onOpenRegisterModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-orbitron font-bold text-xs rounded-lg transition-all"
          >
            <span>+ REGISTER NEW FACE</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Scanner (7 cols) + Live Feedback & Attendance Log (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Scanner Viewport (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="cyber-card p-4 flex flex-col h-full border-cyan-500/30 min-h-[500px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <h2 className="font-orbitron font-bold text-sm tracking-wide text-cyan-400">
                  REAL-TIME AI ATTENDANCE SCANNER
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Threshold: &lt; 0.5 Euclidean Distance
                </span>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl min-h-[380px]">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  !isCameraActive && 'hidden'
                }`}
                playsInline
                muted
              />

              {/* Landmark and Bounding Box Canvas */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                  !isCameraActive && 'hidden'
                }`}
              />

              {/* Idle State / Camera Off */}
              {!isCameraActive && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <CameraOff className="w-16 h-16 mb-3 text-slate-600 animate-pulse" />
                  <p className="font-orbitron font-bold text-sm text-slate-300 mb-1">
                    CAMERA FEED INACTIVE
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mb-4">
                    {cameraError || 'Activate camera stream to start automatic attendance check-in'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs rounded-lg transition-all"
                  >
                    START SCANNER CAMERA
                  </button>
                </div>
              )}

              {/* Scanning Target Guide Oval */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div
                    className={`w-60 h-72 rounded-[50%] border-2 transition-all duration-300 ${
                      scannerStatus === 'MATCHED'
                        ? 'border-emerald-400 shadow-[0_0_35px_#10B981]'
                        : scannerStatus === 'COOLDOWN'
                        ? 'border-amber-400 shadow-[0_0_25px_#F59E0B]'
                        : scannerStatus === 'UNKNOWN'
                        ? 'border-red-500 shadow-[0_0_25px_#EF4444]'
                        : 'border-cyan-400/70 shadow-[0_0_20px_#06B6D4]'
                    }`}
                  >
                    {/* Animated Radar Sweep Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce mt-14" />
                  </div>
                </div>
              )}

              {/* Instant Verification Overlay Badge */}
              {latestVerifiedStudent && (
                <div className="absolute top-4 left-4 right-4 p-4 rounded-xl bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md flex items-center justify-between animate-fadeIn z-20">
                  <div className="flex items-center gap-3">
                    {latestVerifiedStudent.photo ? (
                      <img
                        src={latestVerifiedStudent.photo}
                        alt="Student"
                        className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shadow-md"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold font-orbitron text-lg">
                        {latestVerifiedStudent.student.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="font-orbitron font-bold text-emerald-400 text-base">
                          {latestVerifiedStudent.student.name}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-300">
                        Roll/SUID: <strong>{latestVerifiedStudent.student.suid}</strong> | Class:{' '}
                        <strong>{latestVerifiedStudent.student.standard}</strong>
                      </div>
                      <div className="font-mono text-[11px] text-emerald-300/90 mt-0.5">
                        Status: PRESENT | Method: FACE AI | {latestVerifiedStudent.time}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 font-bold text-xs">
                      {latestVerifiedStudent.confidence.toFixed(1)}% MATCH
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Dist: {latestVerifiedStudent.distance.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Real-time Metric Bar */}
              {currentDetectionMetrics && (
                <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-lg bg-black/85 backdrop-blur-md border border-slate-700 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    Live Best Match:{' '}
                    <strong className="text-cyan-300">
                      {currentDetectionMetrics.candidateName}
                    </strong>
                  </span>
                  <span
                    className={
                      currentDetectionMetrics.distance < 0.5
                        ? 'text-emerald-400 font-bold'
                        : 'text-amber-400 font-bold'
                    }
                  >
                    Distance: {currentDetectionMetrics.distance.toFixed(4)} (Threshold &lt; 0.50)
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="mt-3 flex gap-3">
              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="py-2 px-4 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>PAUSE SCANNER</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>RESUME SCANNER</span>
                </button>
              )}

              <button
                onClick={refreshStudents}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-orbitron text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>SYNC DATABASE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Live Attendance Feed & Recent Logs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Today's Punch-in Summary Card */}
          <div className="cyber-card p-4 border-slate-800 bg-slate-950 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-orbitron font-bold text-xs tracking-wide text-emerald-400">
                  LIVE ATTENDANCE FEED (TODAY)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                {attendanceLogs.length} PUNCH-INS
              </span>
            </div>

            {/* Attendance Logs List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] pr-1">
              {attendanceLogs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 p-4">
                  <UserCheck className="w-10 h-10 mb-2 text-slate-600" />
                  <p className="font-orbitron text-xs text-slate-400">No attendance scans yet today</p>
                  <p className="text-[11px]">Faces verified by the scanner will automatically appear here</p>
                </div>
              ) : (
                attendanceLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold font-orbitron text-xs">
                        {log.student_name ? log.student_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-slate-200">
                          {log.student_name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {log.suid} • {log.standard}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{log.time}</span>
                      </div>
                      <div className="text-[10px] text-cyan-400/80">
                        {log.confidence_score ? `${log.confidence_score}% Face Match` : 'Face AI Verified'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
