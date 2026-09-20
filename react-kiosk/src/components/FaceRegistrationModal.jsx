import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  UserPlus,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  faceapi,
  loadFaceApiModels,
  detectSingleFaceWithDescriptor,
  detectAllFacesInFrame,
} from '../services/faceModelLoader';
import { saveStudentFaceEncoding } from '../services/supabaseClient';

export const FaceRegistrationModal = ({
  isOpen,
  onClose,
  existingStudents = [],
  onStudentSaved,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Student Form State
  const [mode, setMode] = useState('new'); // 'new' or 'existing'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [suid, setSuid] = useState('');
  const [standard, setStandard] = useState('Std 10-A');
  const [nfcCode, setNfcCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Detection & Capture State
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('IDLE'); // IDLE, NO_FACE, MULTIPLE, READY, CAPTURING
  const [helperMessage, setHelperMessage] = useState('Position your face inside the frame');
  const [detectedLandmarksCount, setDetectedLandmarksCount] = useState(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [savingState, setSavingState] = useState(false);
  const [saveSuccessData, setSaveSuccessData] = useState(null);

  // Initialize Models
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setIsModelLoading(true);
        await loadFaceApiModels();
        if (mounted) {
          setIsModelLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setModelError('Could not load AI Face Models from /models. Ensure model files exist.');
          setIsModelLoading(false);
        }
      }
    };
    if (isOpen) {
      init();
      startCamera();
    } else {
      stopCamera();
      resetForm();
    }
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isOpen]);

  // Sync selected existing student
  useEffect(() => {
    if (mode === 'existing' && selectedStudentId) {
      const found = existingStudents.find((s) => s.id === selectedStudentId);
      if (found) {
        setStudentName(found.name || '');
        setSuid(found.suid || '');
        setStandard(found.standard || 'Std 10-A');
        setNfcCode(found.nfcCode || '');
      }
    }
  }, [selectedStudentId, mode, existingStudents]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          startLiveDetection();
        };
      }
    } catch (err) {
      console.error('[Webcam Error]', err);
      setCameraError('Camera access denied or device not found.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Live Face Detection Loop on Preview Canvas
  const startLiveDetection = () => {
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);

    let stableFrames = 0;

    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (capturedSnapshot || savingState) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
      faceapi.matchDimensions(canvas, displaySize);

      try {
        const allFaces = await detectAllFacesInFrame(video);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!allFaces || allFaces.length === 0) {
          stableFrames = 0;
          setFaceDetectionStatus('NO_FACE');
          setHelperMessage('No face detected. Please face the camera directly.');
          return;
        }

        if (allFaces.length > 1) {
          stableFrames = 0;
          setFaceDetectionStatus('MULTIPLE');
          setHelperMessage(`⚠️ ${allFaces.length} faces detected! Only 1 person must be in frame.`);
          // Draw warning boxes
          faceapi.draw.drawDetections(canvas, faceapi.resizeResults(allFaces, displaySize));
          return;
        }

        // Exactly one face detected
        const singleResult = await detectSingleFaceWithDescriptor(video);
        if (singleResult) {
          const resized = faceapi.resizeResults(singleResult, displaySize);
          // Draw custom sleek bounding box and landmarks
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceLandmarks(canvas, resized);

          setDetectedLandmarksCount(singleResult.landmarks.positions.length);
          setFaceDetectionStatus('READY');
          setHelperMessage('✅ Stable face locked! Click "Capture & Register Face"');

          stableFrames += 1;
        }
      } catch (e) {
        // detection cycle error ignore
      }
    }, 280);
  };

  // Capture face and extract 128-D descriptor
  const handleCaptureFace = async () => {
    if (!videoRef.current) return;
    setSavingState(true);
    setHelperMessage('Extracting 128-dimensional facial vector...');

    try {
      const detection = await detectSingleFaceWithDescriptor(videoRef.current);
      if (!detection) {
        setFaceDetectionStatus('NO_FACE');
        setHelperMessage('Could not detect a clear face. Please stay still and try again.');
        setSavingState(false);
        return;
      }

      // 128-dimensional float descriptor
      const descriptor = detection.descriptor; // Float32Array(128)
      const faceEncoding = Array.from(descriptor); // JSON serializable array

      // Capture snapshot image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // Mirror image horizontally to match preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);

      setCapturedDescriptor(faceEncoding);
      setCapturedSnapshot(snapshotUrl);
      setSavingState(false);
      setHelperMessage('Face vector extracted! Complete details to save.');
    } catch (err) {
      console.error('[Capture Error]', err);
      setHelperMessage(`Capture failed: ${err.message}`);
      setSavingState(false);
    }
  };

  // Submit and save to database (Module A Storage step)
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!capturedDescriptor) {
      setHelperMessage('Please capture a face first before saving.');
      return;
    }

    if (mode === 'new' && !studentName.trim()) {
      setHelperMessage('Please enter student name.');
      return;
    }

    setSavingState(true);
    setHelperMessage('Saving 128-D face encoding to Supabase students table...');

    try {
      const targetId = mode === 'existing' ? selectedStudentId : null;
      const finalSuid = suid.trim() || `SUID-${Date.now().toString().slice(-4)}`;

      // Execute Supabase update / insert
      // await supabase.from("students").update({ face_encoding: Array.from(descriptor) }).eq("id", studentId);
      const res = await saveStudentFaceEncoding({
        studentId: targetId,
        descriptorArray: capturedDescriptor,
        studentName: studentName.trim(),
        suid: finalSuid,
        standard: standard.trim(),
        nfcCode: nfcCode.trim(),
        mobileNumber: mobileNumber.trim(),
        photoBase64: capturedSnapshot,
      });

      setSaveSuccessData({
        name: studentName.trim(),
        suid: finalSuid,
        standard: standard.trim(),
        dbSaved: res.dbSaved,
        vectorDimensions: capturedDescriptor.length,
      });

      if (onStudentSaved) {
        onStudentSaved(res.student);
      }
    } catch (err) {
      console.error('[Save Error]', err);
      setHelperMessage(`Failed to save: ${err.message}`);
    } finally {
      setSavingState(false);
    }
  };

  const resetForm = () => {
    setCapturedDescriptor(null);
    setCapturedSnapshot(null);
    setSaveSuccessData(null);
    setFaceDetectionStatus('IDLE');
    setHelperMessage('Position your face inside the frame');
    setSavingState(false);
    if (cameraActive) {
      startLiveDetection();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D1322] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#111A2E] to-slate-900 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-base text-cyan-300 tracking-wide">
                MODULE A: FACE ENROLLMENT & REGISTRATION
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Generate 128-D Biometric Vector & Save to Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Camera Preview & Live Facial Landmark Detection (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  capturedSnapshot ? 'hidden' : ''
                }`}
                playsInline
                muted
              />

              {/* Landmark Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                  capturedSnapshot ? 'hidden' : ''
                }`}
              />

              {/* Captured Snapshot Display */}
              {capturedSnapshot && (
                <div className="relative w-full h-full">
                  <img
                    src={capturedSnapshot}
                    alt="Captured Face"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500/90 text-black font-orbitron font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>128-D VECTOR EXTRACTED</span>
                  </div>
                </div>
              )}

              {/* Camera Offline Notice */}
              {!cameraActive && !capturedSnapshot && (
                <div className="text-center p-6 text-slate-400 flex flex-col items-center">
                  <CameraOff className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                  <p className="text-sm font-orbitron">Initializing Camera Feed...</p>
                  {cameraError && <p className="text-xs text-red-400 mt-2">{cameraError}</p>}
                </div>
              )}

              {/* Face Guide Oval */}
              {cameraActive && !capturedSnapshot && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-300 ${
                      faceDetectionStatus === 'READY'
                        ? 'border-emerald-400 shadow-[0_0_25px_#10B981]'
                        : faceDetectionStatus === 'MULTIPLE'
                        ? 'border-red-500 shadow-[0_0_25px_#EF4444]'
                        : 'border-cyan-400/60 shadow-[0_0_15px_#06B6D4]'
                    }`}
                  />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700 flex items-center justify-between text-xs font-mono">
                <span
                  className={`${
                    faceDetectionStatus === 'READY'
                      ? 'text-emerald-400 font-bold'
                      : faceDetectionStatus === 'MULTIPLE'
                      ? 'text-red-400 font-bold'
                      : 'text-cyan-300'
                  }`}
                >
                  {helperMessage}
                </span>
                {detectedLandmarksCount > 0 && (
                  <span className="text-slate-400 text-[10px]">
                    Landmarks: {detectedLandmarksCount}/68
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons for Camera */}
            <div className="flex gap-2">
              {!capturedSnapshot ? (
                <button
                  type="button"
                  onClick={handleCaptureFace}
                  disabled={faceDetectionStatus !== 'READY' || savingState}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-orbitron font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>CAPTURE & EXTRACT 128-D FACE</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-orbitron font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>RE-TAKE PHOTO</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Student Details Form & Save Confirmation (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {saveSuccessData ? (
              // Success Screen Animation
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_30px_#10B981] animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-orbitron font-bold text-lg text-emerald-400 mb-1">
                  FACE REGISTERED SUCCESSFULLY!
                </h3>
                <p className="text-xs text-slate-300 mb-4 font-mono">
                  {saveSuccessData.name} ({saveSuccessData.suid})
                </p>

                <div className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-left text-xs font-mono space-y-1.5 mb-5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Status:</span>
                    <span className="text-emerald-400 font-bold">
                      {saveSuccessData.dbSaved ? 'Supabase Synced' : 'Cached Locally'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Descriptor Vector:</span>
                    <span className="text-cyan-400 font-bold">
                      {saveSuccessData.vectorDimensions}-D Float Array
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard / Class:</span>
                    <span className="text-slate-200">{saveSuccessData.standard}</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs rounded-lg transition-all"
                  >
                    REGISTER ANOTHER
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-orbitron font-bold text-xs rounded-lg transition-all"
                  >
                    DONE
                  </button>
                </div>
              </div>
            ) : (
              // Enrollment Form
              <form onSubmit={handleSaveStudent} className="flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-orbitron text-cyan-400 font-bold">
                    STUDENT CREDENTIALS
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMode('new')}
                      className={`px-2.5 py-1 text-[11px] font-orbitron rounded-md transition-all ${
                        mode === 'new'
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('existing')}
                      className={`px-2.5 py-1 text-[11px] font-orbitron rounded-md transition-all ${
                        mode === 'existing'
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Existing
                    </button>
                  </div>
                </div>

                {/* Existing student selector */}
                {mode === 'existing' && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      SELECT REGISTERED STUDENT
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="">-- Choose Student --</option>
                      {existingStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.suid}) - {s.standard}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    STUDENT FULL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Patel"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* SUID / Roll No */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      ROLL NO / SUID
                    </label>
                    <input
                      type="text"
                      placeholder="SUID-1001"
                      value={suid}
                      onChange={(e) => setSuid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      STANDARD / CLASS
                    </label>
                    <input
                      type="text"
                      placeholder="Std 10-A"
                      value={standard}
                      onChange={(e) => setStandard(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NFC Card UID */}
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    NFC CARD CODE (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 04:A1:B2:C3"
                    value={nfcCode}
                    onChange={(e) => setNfcCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Vector Descriptor Status */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-slate-400">128-D Biometric Vector:</span>
                  {capturedDescriptor ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Extracted (128 Floats)
                    </span>
                  ) : (
                    <span className="text-amber-400">Pending Capture</span>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  <button
                    type="submit"
                    disabled={!capturedDescriptor || savingState}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-orbitron font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{savingState ? 'SAVING TO SUPABASE...' : 'SAVE FACE ENCODING TO DB'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
