import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Fingerprint,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  ShieldCheck,
  Calculator,
  Delete,
  Sparkles,
  Camera,
  ScanFace,
  Eye,
  SwitchCamera,
} from "lucide-react";
import {
  getKioskConfig,
  lookupStudent,
  punchService,
  getStudentGallery
} from "@/lib/kiosk.functions";
import { captureFinger, matchTemplate, identify } from "@/lib/mantra";
import { matchFace, extractFaceVector } from "@/lib/face";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gurukul Kiosk — Tap & Print Terminal" },
      {
        name: "description",
        content: "Self-service cashless payment terminal with AI Face Recognition, Mantra fingerprint, NFC card and touch keypad amount entry.",
      },
    ],
  }),
  component: Kiosk,
});

type Step = "finger" | "card" | "service";

type VerifiedStudent = {
  studentId: string;
  suid: string;
  name: string;
  nfc_no: string;
  class_name?: string | null | undefined;
  room_no?: string | null | undefined;
  templates: string[];
  facePhoto?: string | null | undefined;
  faceDescriptor?: number[] | null | undefined;
  hasFace: boolean;
  hasFingerprint: boolean;
};

type CapturedScan = {
  template: string;
  quality: number;
  serial?: string | null | undefined;
  at: string;
};

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  print_receipt: boolean;
};

function Kiosk() {
  const [step, setStep] = useState<Step>("card");
  const [bioMode, setBioMode] = useState<"face" | "finger">("face");
  const [capturedScan, setCapturedScan] = useState<CapturedScan | null>(null);
  const [detectedStudent, setDetectedStudent] = useState<VerifiedStudent | null>(null);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [nfc, setNfc] = useState("");
  const [scanning, setScanning] = useState(false);
  const [matchingFace, setMatchingFace] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Background printing receipt container
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Custom Amount Numpad Modal State
  const [customService, setCustomService] = useState<ServiceItem | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>("0");

  const cardInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const getConfig = useServerFn(getKioskConfig);
  const lookup = useServerFn(lookupStudent);
  const punch = useServerFn(punchService);
  const getGallery = useServerFn(getStudentGallery);

  const config = useQuery({
    queryKey: ["kiosk-config"],
    queryFn: () => getConfig(),
    refetchInterval: 30000,
  });

  const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Service Kiosk";
  const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";

  // Camera Management Helpers
  async function startFaceCamera() {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraActive(false);
      setError("Webcam access failed. Please enable camera permission or switch to Mantra Fingerprint.");
    }
  }

  function stopFaceCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    if (step === "card") {
      const t = setTimeout(() => cardInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step]);

  // Safety fallback: If step is 'finger' but no student has tapped card, revert to 'card'
  useEffect(() => {
    if (step === "finger" && !detectedStudent) {
      stopFaceCamera();
      setStep("card");
    }
  }, [step, detectedStudent]);

  // Auto-start camera when entering biometric step in Face mode
  useEffect(() => {
    if (step === "finger" && bioMode === "face" && detectedStudent) {
      const timer = setTimeout(() => {
        void startFaceCamera();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopFaceCamera();
      };
    } else {
      stopFaceCamera();
    }
  }, [step, bioMode, detectedStudent]);

  // Instant Auto-submit NFC card when scanned by card reader on Step 1
  useEffect(() => {
    if (step === "card" && nfc.trim().length > 0 && !busy) {
      const timer = setTimeout(() => {
        void submitCard(nfc);
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [nfc, step, busy]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successBanner) {
      const t = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [successBanner]);

  function reset() {
    stopFaceCamera();
    setStep("card");
    setCapturedScan(null);
    setDetectedStudent(null);
    setStudent(null);
    setNfc("");
    setError("");
    setCustomService(null);
    setCustomAmountStr("0");
    setMatchingFace(false);
    setScanning(false);
  }

  // STEP 1: Identify Student by NFC Card
  async function submitCard(value: string) {
    const code = value.trim();
    if (!code) return;

    setBusy(true);
    setError("");
    try {
      const result = await lookup({ data: { nfc: code } });
      
      if (result.status === "not_found") {
        setError("❌ Card not recognized. This NFC card is not registered in the system.");
        setNfc("");
        return;
      }
      if (result.status === "blocked") {
        setError(`❌ Account Blocked: ${result.message}`);
        setNfc("");
        return;
      }
      if (result.status !== "ok") {
        setError(`❌ ${result.message}`);
        setNfc("");
        return;
      }

      const identified: VerifiedStudent = {
        studentId: result.studentId,
        suid: result.suid,
        name: result.name,
        nfc_no: result.nfc_no,
        class_name: result.class_name,
        room_no: result.room_no,
        templates: result.templates || [],
        facePhoto: result.facePhoto,
        faceDescriptor: result.faceDescriptor,
        hasFace: result.hasFace,
        hasFingerprint: result.hasFingerprint,
      };

      setDetectedStudent(identified);
      setSuccessBanner(`Card Identified: ${identified.name} (${identified.suid})`);
      
      // Auto-choose primary biometric: If Face is enrolled, default to Face; else Fingerprint
      if (identified.hasFace) {
        setBioMode("face");
      } else if (identified.hasFingerprint) {
        setBioMode("finger");
      } else {
        setBioMode("face");
      }

      // Advance to Step 2: Biometric Verification
      setStep("finger");
    } catch {
      setError("Error connecting to server. Please tap your card again.");
    } finally {
      setBusy(false);
    }
  }

  // STEP 2A: Verify Live Face against Cardholder Enrolled Face
  async function verifyLiveFace() {
    if (!detectedStudent) {
      setError("Please tap your NFC card first.");
      setStep("card");
      return;
    }

    if (!detectedStudent.hasFace && !detectedStudent.facePhoto) {
      setError(`❌ ${detectedStudent.name} નો ફેસ એડમિન પોર્ટલમાં રજીસ્ટર નથી. પહેલા એડમિનમાંથી ફેસ ઉમેરો અથવા નીચેથી ફિંગરપ્રિન્ટ પસંદ કરો.`);
      return;
    }

    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      setError("Camera is loading. Please position your face and try again.");
      return;
    }

    setMatchingFace(true);
    setError("");

    try {
      // 1. Capture live frame to hidden canvas
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not process camera image.");
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const probePhoto = canvas.toDataURL("image/jpeg", 0.85);
      const probeVector = extractFaceVector(canvas);

      if (!probeVector || probeVector.length < 32) {
        setError("❌ No human face detected. Please position your face clearly in the camera frame with proper lighting.");
        return;
      }

      // 2. Perform 1:1 match against the cardholder's enrolled face photo/vector
      const result = await matchFace(
        probePhoto,
        detectedStudent.facePhoto || "",
        probeVector,
        detectedStudent.faceDescriptor || []
      );

      // Strict enforcement: Must be verified AND score >= 70%
      if (!result.verified || result.score < 70) {
        setError(result.reason || `❌ Face does not match the scanned NFC card (${Math.round(result.score)}% match). Proxy / unauthorized user rejected.`);
        return;
      }

      // Face match succeeded!
      stopFaceCamera();
      setStudent(detectedStudent);
      setSuccessBanner(`✅ Face Verified: Welcome, ${detectedStudent.name}! (${Math.round(result.score)}% Match)`);
      setStep("service");
    } catch (err: any) {
      setError(err?.message || "Facial recognition error. Please position your face clearly in the camera.");
    } finally {
      setMatchingFace(false);
    }
  }

  // STEP 2B: Verify Physical Biometric Presence on Mantra Sensor
  async function startFingerScan() {
    if (!detectedStudent) {
      setError("Please tap your NFC card first.");
      setStep("card");
      return;
    }

    setScanning(true);
    setError("");
    try {
      const capture = await captureFinger(50, 10);
      if (!capture.ok) {
        setError(capture.error || "Failed to capture fingerprint. Please place finger firmly on sensor.");
        return;
      }

      setCapturedScan({
        template: capture.template,
        quality: capture.quality,
        serial: capture.serial,
        at: new Date().toISOString(),
      });

      // Check that this student has registered biometric templates from Step 1
      const studentTemplates = detectedStudent.templates || [];
      if (studentTemplates.length === 0) {
        setError(`❌ ${detectedStudent.name} ની ફિંગરપ્રિન્ટ એડમિન પોર્ટલમાં રજીસ્ટર કરેલી નથી. પહેલા એડમિનમાંથી ફિંગર ઉમેરો અથવા ઉપરથી AI Face પસંદ કરો.`);
        return;
      }

      setBusy(true);

      // Strictly match incoming fingerprint template against the biometric record of the NFC cardholder verified in Step 1
      const matchResults = await Promise.all(
        studentTemplates.map((registeredTemplate) => matchTemplate(capture.template, registeredTemplate))
      );
      const isMatched = matchResults.some(Boolean);

      // If the fingerprint does not match that specific student's registered template, reject
      if (!isMatched) {
        setError("Fingerprint does not match the scanned NFC card.");
        return;
      }

      // Biometric verification succeeded!
      stopFaceCamera();
      setStudent(detectedStudent);
      setSuccessBanner(`Biometric Verified: Welcome, ${detectedStudent.name}!`);

      // Advance to Step 3: Cashless Services
      setStep("service");
    } catch {
      setError("Biometric communication error. Please place your finger firmly on the Mantra sensor and try again.");
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  // STEP 3: Handle Service Click (Fixed vs Custom Touch Keypad)
  function handleServiceClick(service: ServiceItem) {
    if (service.price === 0) {
      // Custom manual amount required -> Open Touch Keypad
      setCustomService(service);
      setCustomAmountStr("0");
    } else {
      // Fixed price -> Direct Punch
      void executePunch(service.id, service.price);
    }
  }

  async function executePunch(serviceId: string, amount?: number) {
    if (!student) return;
    setBusy(true);
    setError("");
    const studentName = student.name;
    const studentNfc = student.nfc_no;

    try {
      const res = await punch({
        data: {
          nfc: studentNfc,
          serviceId,
          customAmount: amount && amount > 0 ? amount : undefined,
        },
      });

      if (res.status === "ok") {
        setSuccessBanner(`✅ ${res.message} for ${studentName}`);

        if (res.print && res.receipt) {
          const rData: ReceiptData = {
            receiptNo: res.receipt.receiptNo,
            suid: res.receipt.suid,
            name: res.receipt.name,
            className: res.receipt.className,
            roomNo: res.receipt.roomNo,
            service: res.receipt.service,
            amount: res.receipt.amount,
            at: res.receipt.at,
          };
          setActiveReceipt(rData);

          // Direct browser thermal print with raw thermal format
          setTimeout(() => {
            window.print();
          }, 300);
        }

        // Reset kiosk back to Step 1 for next student
        setTimeout(() => {
          reset();
        }, 1500);
      } else if (res.status === "blocked") {
        setError(`❌ Card Blocked: ${res.message}`);
      } else if (res.status === "limit") {
        setError(`⚠️ Limit Exceeded: ${res.message}`);
      } else {
        setError("❌ Card not recognized or registered.");
      }
    } catch {
      setError("Transaction processing error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Touch Keypad Input Handlers
  function handleKeypadDigit(digit: string) {
    if (customAmountStr === "0") {
      setCustomAmountStr(digit);
    } else {
      setCustomAmountStr((prev) => prev + digit);
    }
  }

  function handleKeypadBackspace() {
    if (customAmountStr.length <= 1) {
      setCustomAmountStr("0");
    } else {
      setCustomAmountStr((prev) => prev.slice(0, -1));
    }
  }

  function handleKeypadClear() {
    setCustomAmountStr("0");
  }

  function handleAddChipAmount(add: number) {
    const current = Number(customAmountStr) || 0;
    const next = Math.min(10000, current + add);
    setCustomAmountStr(String(next));
  }

  function handleKeypadSubmit() {
    const amt = parseFloat(customAmountStr);
    if (!customService || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount greater than ₹0");
      return;
    }
    const sId = customService.id;
    setCustomService(null);
    void executePunch(sId, amt);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#f8f5ee] via-[#f4ecdf] to-[#ede3d1] text-[#2c1810] p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Animated Luxury Glow Spots */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-gradient-to-br from-amber-400/15 to-transparent blur-3xl pointer-events-none animate-float" />
      <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-gradient-to-tl from-rose-500/10 to-transparent blur-3xl pointer-events-none animate-float" style={{ animationDelay: "2s" }} />

      {/* Background Thermal Slip for Instant Window Print */}
      {activeReceipt && (
        <div id="receipt-print-area" className="hidden print:block">
          <ReceiptSlip
            title={title}
            receipt={activeReceipt}
            footerText={footerText}
          />
        </div>
      )}

      {/* Top Header & Branding */}
      <header className="relative text-center space-y-2 py-4">
        {/* Top Left Logo (Click opens Admin Login Portal) */}
        <Link
          to="/auth"
          title="Click to Open Admin Login Portal"
          className="absolute left-0 top-0 transition-all duration-300 hover:scale-110 active:scale-95 group z-20 cursor-pointer"
        >
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-[#8b2500] opacity-40 blur-sm group-hover:opacity-100 transition duration-300" />
            <img
              src="/logo.png"
              alt="Shree Swaminarayan Gurukul Rajkot Logo"
              className="relative size-16 md:size-20 rounded-full object-contain bg-white p-1.5 shadow-xl border border-amber-400/50 group-hover:border-[#8b2500] transition-colors"
            />
          </div>
        </Link>

        {/* Center Title & Subtitle */}
        <div className="max-w-4xl mx-auto px-16 sm:px-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ebdcc8]/90 backdrop-blur-xs text-[#8b2500] text-xs font-bold tracking-wider uppercase shadow-inner border border-[#d8c5af]/80 mb-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
            <Sparkles className="size-3.5 text-amber-600 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Shree Swaminarayan Gurukul • Campus Kiosk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-serif font-black tracking-tight text-[#4a1c14] drop-shadow-sm whitespace-nowrap">
            {title}
          </h1>
          <p className="text-sm md:text-base font-medium text-[#7c533f] tracking-wide mt-1">
            {subtitle}
          </p>
        </div>

        {/* 3-Step Flow Indicator */}
        <div className="flex items-center gap-2 md:gap-3 justify-center pt-4">
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              step === "card"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : detectedStudent
                  ? "bg-emerald-600/20 text-emerald-900 border border-emerald-500/40"
                  : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            {detectedStudent ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null} 1. Tap NFC Card
          </span>
          <span className="text-[#c5a880] font-bold">——</span>
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              step === "finger"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : student
                  ? "bg-emerald-600/20 text-emerald-900 border border-emerald-500/40"
                  : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            {student ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null} 2. Biometric Verify
          </span>
          <span className="text-[#c5a880] font-bold">——</span>
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              step === "service"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            3. Cashless Service
          </span>
        </div>
      </header>

      {/* Instant Success Flash Notification */}
      {successBanner && (
        <div className="max-w-xl mx-auto w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-2xl flex items-center justify-center gap-3 text-center text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-4 duration-300 z-30">
          <CheckCircle2 className="size-6 shrink-0 text-emerald-200" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Main Terminal Stage */}
      <main className="flex-1 flex items-center justify-center my-4 relative z-10">
        {/* STEP 1: NFC Smart Card Tap — Identifies Student */}
        {step === "card" && (
          <Card className="w-full max-w-xl p-8 md:p-12 text-center bg-white/95 backdrop-blur-md border-2 border-[#e5d8c5] shadow-[0_20px_60px_-15px_rgba(74,28,20,0.15)] rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Live RFID Radar Circle */}
            <div className="relative mx-auto size-36 rounded-full bg-gradient-to-b from-[#fdfbf7] to-[#f4ebe0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner animate-pulse-ring">
              <CreditCard className="size-16 text-[#8b2500] animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]">
                Step 1: Tap Your NFC Card
              </h2>
              <p className="text-sm md:text-base text-[#7c533f]">
                Please tap your registered Smart Card on the <strong>ID TECH</strong> reader to begin.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left animate-in fade-in duration-200">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nfc.trim()) void submitCard(nfc);
              }}
              className="space-y-4"
            >
              <Input
                ref={cardInputRef}
                type="text"
                autoFocus
                disabled={busy}
                placeholder="Tap card on ID TECH reader..."
                value={nfc}
                onChange={(e) => setNfc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nfc.trim()) {
                    e.preventDefault();
                    void submitCard(nfc);
                  }
                }}
                className="h-16 text-center font-mono text-xl font-bold bg-[#fdfbf7] border-2 border-[#d8c5af] rounded-2xl focus-visible:ring-2 focus-visible:ring-[#8b2500] shadow-inner"
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={busy || !nfc.trim()}
                  className="w-full h-14 font-bold text-base bg-[#4a1c14] hover:bg-[#6b2c1a] text-white rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  {busy ? <Loader2 className="size-5 animate-spin mr-2" /> : "Verify & Proceed"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* STEP 2: Dual Biometric Verification Stage (AI Face Camera & Mantra Fingerprint) */}
        {step === "finger" && detectedStudent && (
          <Card className="w-full max-w-xl p-6 md:p-10 text-center bg-white/95 backdrop-blur-md border-2 border-[#e5d8c5] shadow-[0_20px_60px_-15px_rgba(74,28,20,0.15)] rounded-3xl space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Student Verified Info Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                {detectedStudent.facePhoto ? (
                  <img
                    src={detectedStudent.facePhoto}
                    alt={detectedStudent.name}
                    className="size-11 rounded-full object-cover border-2 border-emerald-600 shadow-sm"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    {detectedStudent.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-emerald-950">{detectedStudent.name}</div>
                  <div className="text-[11px] text-emerald-700 font-mono">{detectedStudent.suid} • {detectedStudent.class_name || "Gurukul"}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="size-3.5" /> Card Verified
              </span>
            </div>

            {/* Biometric Method Selector Tabs */}
            <div className="flex items-center justify-center gap-2 p-1.5 bg-[#f4ece0] rounded-2xl border border-[#e5d8c5]">
              <button
                type="button"
                onClick={() => {
                  setBioMode("face");
                  setError("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bioMode === "face"
                    ? "bg-[#4a1c14] text-white shadow-md"
                    : "text-[#7c533f] hover:text-[#4a1c14]"
                }`}
              >
                <Camera className="size-4" />
                <span>AI Face Camera</span>
                {detectedStudent.hasFace && (
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopFaceCamera();
                  setBioMode("finger");
                  setError("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bioMode === "finger"
                    ? "bg-[#4a1c14] text-white shadow-md"
                    : "text-[#7c533f] hover:text-[#4a1c14]"
                }`}
              >
                <Fingerprint className="size-4" />
                <span>Mantra Fingerprint</span>
                {detectedStudent.hasFingerprint && (
                  <span className="size-2 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {/* OPTION A: AI Face Camera Live Scan Mode */}
            {bioMode === "face" && (
              <div className="space-y-4">
                {/* Live Camera Scanner Box */}
                <div className="relative mx-auto size-56 sm:size-64 rounded-3xl overflow-hidden border-3 border-[#8b2500] bg-black shadow-xl">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                        el.srcObject = mediaStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="size-full object-cover scale-x-[-1]"
                  />

                  {/* Facial Scanner Target Reticle & Laser */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Animated Scanning Laser */}
                    <div className="absolute inset-x-0 top-0 animate-laser">
                      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.9)]" />
                      <div className="h-16 w-full bg-gradient-to-b from-emerald-500/20 to-transparent blur-sm" />
                    </div>

                    {/* Circular Face Reticle */}
                    <div className="absolute inset-0 m-4 rounded-full border-2 border-dashed border-amber-400/80 animate-pulse" />
                    
                    {/* Corner Crosshairs */}
                    <div className="absolute top-3 left-3 size-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute top-3 right-3 size-4 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute bottom-3 left-3 size-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute bottom-3 right-3 size-4 border-b-2 border-r-2 border-emerald-400" />
                  </div>

                  {matchingFace && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in">
                      <Loader2 className="size-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-bold tracking-wider uppercase">Matching Face with AI...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-[#4a1c14]">
                    Look Directly Into Camera
                  </h2>
                  <p className="text-xs md:text-sm text-[#7c533f]">
                    Align your face within the circle to verify identity against NFC card.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 text-left animate-in fade-in duration-200">
                    <AlertCircle className="size-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Button
                    size="lg"
                    onClick={() => void verifyLiveFace()}
                    disabled={matchingFace}
                    className="w-full h-14 text-base font-bold text-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(139,37,0,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shimmer-btn cursor-pointer bg-gradient-to-r from-[#4a1c14] to-[#8b2500]"
                  >
                    {matchingFace ? (
                      <>
                        <Loader2 className="size-5 animate-spin mr-2" />
                        Verifying Face...
                      </>
                    ) : (
                      <>
                        <ScanFace className="size-5 mr-2 text-emerald-300" />
                        📸 Verify Face Match
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopFaceCamera();
                        setBioMode("finger");
                      }}
                      className="text-xs text-[#8b2500] hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Fingerprint className="size-3.5" /> Use Mantra Fingerprint Instead
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="text-xs text-[#7c533f] hover:text-[#4a1c14] font-medium"
                    >
                      Cancel / New Card
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OPTION B: Mantra Fingerprint Scanner Mode */}
            {bioMode === "finger" && (
              <div className="space-y-4">
                {/* Live Biometric Scanner Circle with Laser Beam & Pulse Rings */}
                <div className="relative mx-auto size-36 md:size-40 rounded-full bg-gradient-to-b from-[#fdfbf7] to-[#f4ebe0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner animate-pulse-ring overflow-hidden group">
                  {/* Animated Laser Scanning Beam */}
                  <div className="absolute inset-x-0 top-0 z-10 pointer-events-none animate-laser">
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
                    <div className="h-12 w-full bg-gradient-to-b from-rose-500/20 to-transparent blur-sm" />
                  </div>

                  {/* Central Glowing Biometric Icon */}
                  <Fingerprint
                    className={`size-20 md:size-24 text-[#8b2500] transition-all duration-300 drop-shadow-md ${
                      scanning ? "scale-110 text-rose-600 animate-pulse" : "group-hover:scale-105"
                    }`}
                  />

                  {scanning && (
                    <span className="absolute inset-0 rounded-full border-4 border-rose-500 animate-ping opacity-40" />
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-[#4a1c14]">
                    Place Finger on Mantra Sensor
                  </h2>
                  <p className="text-xs md:text-sm text-[#7c533f]">
                    {scanning
                      ? "Scanning finger on Mantra sensor now..."
                      : `Touch the Mantra sensor with your registered finger to confirm presence.`}
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 text-left animate-in fade-in duration-200">
                    <AlertCircle className="size-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Button
                    size="lg"
                    onClick={() => void startFingerScan()}
                    disabled={scanning}
                    className="w-full h-14 text-base font-bold text-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(139,37,0,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shimmer-btn cursor-pointer bg-gradient-to-r from-[#4a1c14] to-[#8b2500]"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="size-5 animate-spin mr-2" />
                        Scanning Mantra Fingerprint...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="size-5 mr-2" />
                        Touch to Scan Fingerprint
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBioMode("face");
                      }}
                      className="text-xs text-[#8b2500] hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Camera className="size-3.5" /> Switch to AI Face Camera
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="text-xs text-[#7c533f] hover:text-[#4a1c14] font-medium"
                    >
                      Cancel / New Card
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* STEP 3: Service Selection Grid */}
        {step === "service" && student && (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Verified Student Banner */}
            <Card className="p-5 bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-lg rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {student.facePhoto ? (
                  <img
                    src={student.facePhoto}
                    alt={student.name}
                    className="size-14 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                  />
                ) : (
                  <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 flex items-center justify-center font-serif font-bold text-xl">
                    {student.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#4a1c14]">{student.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/15 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Verified
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#7c533f] mt-0.5">
                    SUID: <span className="font-bold text-[#4a1c14]">{student.suid}</span>
                    {student.class_name ? ` • Class: ${student.class_name}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="rounded-xl border-[#d8c5af] text-[#6b4a3a] hover:bg-[#f5ecdf]"
              >
                <RefreshCw className="size-4 mr-1.5" /> Cancel / Exit
              </Button>
            </Card>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Services Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {(config.data?.services ?? []).map((service) => {
                const isCustom = service.price === 0;

                return (
                  <Card
                    key={service.id}
                    onClick={() => !busy && handleServiceClick(service)}
                    className="group relative cursor-pointer overflow-hidden p-8 text-center bg-white/90 backdrop-blur-sm border-2 border-[#e5d8c5] hover:border-[#8b2500] shadow-xl hover:shadow-2xl rounded-3xl transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="mx-auto size-20 rounded-full bg-[#fdf8f0] group-hover:bg-[#f7ece0] border border-[#e5d8c5] flex items-center justify-center mb-4 transition-colors">
                      {isCustom ? (
                        <Calculator className="size-9 text-[#8b2500]" />
                      ) : (
                        <Printer className="size-9 text-[#8b2500]" />
                      )}
                    </div>
                    <h4 className="text-2xl font-serif font-bold text-[#4a1c14] group-hover:text-[#8b2500]">
                      {service.name}
                    </h4>

                    {isCustom ? (
                      <div className="mt-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                          Custom Amount
                        </span>
                        <div className="text-lg font-bold text-[#8b2500] mt-1">
                          Touch to Enter ₹
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-3xl font-extrabold text-[#8b2500]">
                        ₹{service.price}
                      </div>
                    )}

                    <p className="text-xs text-[#7c533f] mt-2 font-medium">
                      {service.print_receipt ? "Prints thermal receipt" : "Digital transaction"}
                    </p>

                    <Button
                      size="lg"
                      disabled={busy}
                      className="w-full mt-6 bg-[#4a1c14] group-hover:bg-[#8b2500] text-white font-bold rounded-xl shadow-md"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : isCustom ? (
                        "Enter Amount"
                      ) : (
                        "Select & Pay ₹" + service.price
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* TOUCHSCREEN NUMPAD DIALOG FOR CUSTOM AMOUNT (e.g. Store / Canteen) */}
      <Dialog open={customService !== null} onOpenChange={(open) => !open && setCustomService(null)}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-3xl border-[#e5d8c5] shadow-2xl">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-2xl font-serif font-bold text-[#4a1c14] flex items-center justify-center gap-2">
              <Calculator className="size-6 text-[#8b2500]" />
              {customService?.name} — Enter Amount
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Touch the numbers below to enter the exact bill amount.
            </DialogDescription>
          </DialogHeader>

          {/* Amount Display */}
          <div className="my-3 rounded-2xl bg-[#fbf6ee] border-2 border-[#d8c5af] p-4 text-center">
            <span className="text-xs font-bold text-[#7c533f] uppercase tracking-wider block">Total Amount</span>
            <div className="text-4xl md:text-5xl font-mono font-extrabold text-[#4a1c14] mt-1">
              ₹ {customAmountStr}
            </div>
          </div>

          {/* Quick Add Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
            {[10, 20, 50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAddChipAmount(amt)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f2e5d5] hover:bg-[#8b2500] hover:text-white text-[#6b4a3a] border border-[#d8c5af] transition-all"
              >
                +₹{amt}
              </button>
            ))}
          </div>

          {/* 3x4 Touch Numpad Grid */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadDigit(num)}
                className="h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-14 rounded-2xl text-lg font-bold bg-rose-50 hover:bg-rose-100 active:scale-95 border-2 border-rose-200 text-rose-700 transition-all flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDigit("0")}
              className="h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-14 rounded-2xl text-lg font-bold bg-amber-50 hover:bg-amber-100 active:scale-95 border-2 border-amber-200 text-amber-800 transition-all flex items-center justify-center"
            >
              <Delete className="size-6" />
            </button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomService(null)}
              className="w-full sm:w-auto rounded-xl border-[#d8c5af]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || Number(customAmountStr) <= 0}
              onClick={() => customService && executePunch(customService.id, Number(customAmountStr))}
              className="w-full sm:flex-1 h-12 text-base font-bold bg-[#4a1c14] hover:bg-[#8b2500] text-white rounded-xl shadow-lg"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : (
                `Confirm & Pay ₹${customAmountStr}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminal Footer */}
      <footer className="text-center text-xs font-medium text-[#8f6853] py-2 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>Shree Swaminarayan Gurukul, Rajkot · Cashless Kiosk Terminal</span>
        <span className="hidden sm:inline">|</span>
        <span className="font-semibold text-[#6b4a3a]">Powered by EverStep Tech</span>
      </footer>
    </div>
  );
}
