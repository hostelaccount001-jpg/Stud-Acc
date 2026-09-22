import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Printer,
  Receipt,
  Sparkles,
  Delete,
  ShieldCheck,
  ShoppingBag,
  Scissors,
  HeartPulse,
  ChevronRight,
  Tag,
  Building2,
  Key,
  Bed,
} from "lucide-react";
import {
  captureFinger,
  identify,
  useMantraDevice,
} from "@/lib/mantra";
import {
  getKioskConfig,
  punchService,
  getStudentGallery,
} from "@/lib/kiosk.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Gurukul Kiosk — Direct Mantra MFS100 Fingerprint Biometric System",
      },
      {
        name: "description",
        content: "Self-service cashless payment terminal with direct Mantra MFS100 fingerprint biometric authentication.",
      },
    ],
  }),
  component: Kiosk,
});

type Step = "scan" | "service";

type VerifiedStudent = {
  id: string;
  suid: string;
  name: string;
  class_name?: string | null | undefined;
  room_no?: string | null | undefined;
  templates: string[];
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

function getServiceMeta(name: string) {
  const s = name.toLowerCase();
  if (s.includes("store") || s.includes("shop") || s.includes("સ્ટોર")) {
    return {
      icon: ShoppingBag,
      tag: "Campus Store",
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      iconBg: "bg-amber-100 text-amber-900 border-amber-300",
      accent: "text-amber-900",
    };
  }
  if (s.includes("hair") || s.includes("salon") || s.includes("વાળ") || s.includes("cut")) {
    return {
      icon: Scissors,
      tag: "Salon & Grooming",
      gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
      iconBg: "bg-sky-100 text-sky-900 border-sky-300",
      accent: "text-sky-900",
    };
  }
  if (s.includes("med") || s.includes("doctor") || s.includes("દવા") || s.includes("clinic")) {
    return {
      icon: HeartPulse,
      tag: "Healthcare & Clinic",
      gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      iconBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accent: "text-emerald-900",
    };
  }
  if (s.includes("hari") || s.includes("jayanti") || s.includes("utsav") || s.includes("ઉત્સવ")) {
    return {
      icon: Sparkles,
      tag: "Events & Festival",
      gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
      iconBg: "bg-purple-100 text-purple-900 border-purple-300",
      accent: "text-purple-900",
    };
  }
  return {
    icon: Tag,
    tag: "Campus Service",
    gradient: "from-[#8b2500]/20 via-[#8b2500]/5 to-transparent",
    iconBg: "bg-amber-100 text-[#8b2500] border-amber-300",
    accent: "text-[#4a1c14]",
  };
}

function Kiosk() {
  const [step, setStep] = useState<Step>("scan");
  const [capturedScan, setCapturedScan] = useState<CapturedScan | null>(null);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Background printing receipt container
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Custom Amount Numpad Modal State
  const [customService, setCustomService] = useState<ServiceItem | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>("0");

  // Zero-Touch Auto-Detect Mode: device continuously listens for finger touch
  const [autoDetect, setAutoDetect] = useState<boolean>(true);

  const getConfig = useServerFn(getKioskConfig);
  const punch = useServerFn(punchService);
  const getGallery = useServerFn(getStudentGallery);

  // Live Mantra MFS100 device status
  const { device, checking: deviceChecking, isConnected } = useMantraDevice(3000);

  const config = useQuery({
    queryKey: ["kiosk-config"],
    queryFn: () => getConfig(),
    refetchInterval: 30000,
  });

  const galleryQuery = useQuery({
    queryKey: ["kiosk-gallery"],
    queryFn: () => getGallery(),
    refetchInterval: 60000,
  });

  const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Biometric Kiosk Terminal";
  const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";

  // Auto-dismiss success banner
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successBanner]);

  function reset() {
    setStep("scan");
    setCapturedScan(null);
    setStudent(null);
    setError("");
    setCustomService(null);
    setCustomAmountStr("0");
    setScanning(false);
    setBusy(false);
  }

  // AUTO-DETECT: Zero-Touch Continuous Biometric Sensing Loop
  // The moment any student places their finger on the sensor glass, it auto-captures and verifies
  useEffect(() => {
    let cancelled = false;

    if (step !== "scan" || !autoDetect || !isConnected || busy) {
      return;
    }

    const runAutoSensing = async () => {
      const gallery = galleryQuery.data || [];
      if (gallery.length === 0) {
        return;
      }

      while (!cancelled && step === "scan" && autoDetect) {
        setScanning(true);
        try {
          // Listen on sensor for up to 5 seconds per sensing block
          const capture = await captureFinger(45, 5);
          if (cancelled) break;

          if (capture.ok && capture.template) {
            setScanning(false);
            setBusy(true);

            setCapturedScan({
              template: capture.template,
              quality: capture.quality,
              serial: capture.serial,
              at: new Date().toISOString(),
            });

            // Fast 1:N Hardware/Algorithm Match across enrolled students
            const matched = await identify(capture.template, gallery);

            if (matched) {
              const verified: VerifiedStudent = {
                id: matched.id,
                suid: matched.suid,
                name: matched.name,
                class_name: matched.class_name,
                room_no: matched.room_no,
                templates: matched.templates || [],
              };

              setStudent(verified);
              setSuccessBanner(`Biometric Verified: Welcome, ${verified.name}!`);
              setStep("service");
              setBusy(false);
              break; // exit loop as student is now verified
            } else {
              setError("❌ Fingerprint not recognized. Please place your registered finger firmly on the sensor.");
              setBusy(false);
              await new Promise((resolve) => setTimeout(resolve, 2500));
              if (!cancelled) setError("");
            }
          } else {
            // Normal timeout (no finger touched during 5s window)
            // Pause 200ms and continue next sensing loop seamlessly
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } finally {
          if (!cancelled && step === "scan") {
            setScanning(false);
          }
        }
      }
    };

    const timer = setTimeout(() => {
      void runAutoSensing();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, autoDetect, isConnected, busy, galleryQuery.data]);

  // STEP 1: Direct Fingerprint Scan & 1:N Identification (Manual Button Fallback)
  async function startFingerScan() {
    if (scanning || busy) return;
    setScanning(true);
    setError("");

    try {
      const capture = await captureFinger(50, 10);
      if (!capture.ok) {
        setError(capture.error || "Failed to capture fingerprint. Please place finger firmly on sensor glass.");
        setScanning(false);
        return;
      }

      setCapturedScan({
        template: capture.template,
        quality: capture.quality,
        serial: capture.serial,
        at: new Date().toISOString(),
      });

      setBusy(true);

      const gallery = galleryQuery.data || [];
      if (gallery.length === 0) {
        setError("Student database is loading or no biometric records enrolled. Please contact admin.");
        setScanning(false);
        setBusy(false);
        return;
      }

      // Fast 1:N Identification across all enrolled students
      const matched = await identify(capture.template, gallery);

      if (!matched) {
        setError("❌ Fingerprint not recognized. Please place your registered finger firmly on the Mantra sensor.");
        setScanning(false);
        setBusy(false);
        return;
      }

      const verified: VerifiedStudent = {
        id: matched.id,
        suid: matched.suid,
        name: matched.name,
        class_name: matched.class_name,
        room_no: matched.room_no,
        templates: matched.templates || [],
      };

      setStudent(verified);
      setSuccessBanner(`Biometric Verified: Welcome, ${verified.name}!`);
      setStep("service");
    } catch {
      setError("Communication error with Mantra scanner. Check USB connection and driver.");
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  // STEP 2: Service Selection & Execution
  function handleServiceClick(service: ServiceItem) {
    if (service.price === 0) {
      setCustomService(service);
      setCustomAmountStr("0");
    } else {
      void executePunch(service.id, service.price);
    }
  }

  async function executePunch(serviceId: string, amount?: number) {
    if (!student) return;
    setBusy(true);
    setError("");
    const studentName = student.name;

    try {
      const res = await punch({
        data: {
          studentId: student.id,
          suid: student.suid,
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

          // Trigger thermal receipt print
          setTimeout(() => {
            window.print();
          }, 300);
        }

        // Auto-reset back to Step 1 for next student
        setTimeout(() => {
          reset();
        }, 3500);
      } else if (res.status === "blocked") {
        setError(`❌ Student Account Blocked: ${res.message}`);
      } else if (res.status === "limit") {
        setError(`⚠️ Daily Limit Exceeded: ${res.message}`);
      } else {
        setError("❌ Transaction failed. Please try again.");
      }
    } catch {
      setError("Transaction error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Touch Keypad Handlers
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#f8f5ee] via-[#f4ecdf] to-[#ede3d1] text-[#2c1810] p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient Luxury Glow Spots */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-gradient-to-br from-amber-400/15 to-transparent blur-3xl pointer-events-none animate-float" />
      <div
        className="absolute -bottom-32 -right-32 size-96 rounded-full bg-gradient-to-tl from-rose-500/10 to-transparent blur-3xl pointer-events-none animate-float"
        style={{ animationDelay: "2s" }}
      />

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
            <span>Shree Swaminarayan Gurukul • Biometric Kiosk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-serif font-black tracking-tight text-[#4a1c14] drop-shadow-sm whitespace-nowrap">
            {title}
          </h1>
          <p className="text-sm md:text-base font-medium text-[#7c533f] tracking-wide mt-1">
            {subtitle}
          </p>
        </div>

        {/* 2-Step Flow Indicator */}
        <div className="flex items-center gap-3 justify-center pt-3">
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              step === "scan"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : "bg-emerald-600/20 text-emerald-900 border border-emerald-500/40"
            }`}
          >
            {student ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Fingerprint className="size-3.5" />}
            1. Scan Fingerprint (MFS100)
          </span>
          <span className="text-[#c5a880] font-bold">———</span>
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              step === "service"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            <Receipt className="size-3.5" />
            2. Cashless Service
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
        {/* STEP 1: Direct Fingerprint Scan on Mantra MFS100 */}
        {step === "scan" && (
          <Card className="w-full max-w-xl p-8 md:p-12 text-center bg-white/95 backdrop-blur-md border-2 border-[#e5d8c5] shadow-[0_20px_60px_-15px_rgba(74,28,20,0.15)] rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Device Connectivity & Auto-Sense Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : deviceChecking
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : deviceChecking ? "bg-amber-500" : "bg-rose-500"
                  }`}
                />
                {isConnected
                  ? `Mantra ${device?.model || "MFS100"} Ready`
                  : deviceChecking
                  ? "Checking Mantra Device..."
                  : "Mantra Scanner Not Connected"}
              </span>

              {isConnected && autoDetect && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-[#8b2500] border border-amber-500/30 shadow-xs">
                  <Sparkles className="size-3.5 text-amber-700 animate-spin" />
                  Zero-Touch Auto-Sense ON
                </span>
              )}
            </div>

            {/* Ultra-Secure Biometric HUD & Scanner Target */}
            <div className="relative mx-auto w-64 md:w-72 flex flex-col items-center py-2">
              {/* Corner targeting HUD brackets */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#8b2500]/50 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#8b2500]/50 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-7 left-0 w-5 h-5 border-b-2 border-l-2 border-[#8b2500]/50 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-7 right-0 w-5 h-5 border-b-2 border-r-2 border-[#8b2500]/50 rounded-br-sm pointer-events-none" />

              {/* HUD Telemetry Top Badges */}
              <div className="w-full flex justify-between items-center px-1 mb-2.5 text-[10px] font-mono tracking-widest text-[#8b2500]/80 font-semibold select-none">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  [ 500 DPI ]
                </span>
                <span className="tracking-wider uppercase font-bold text-[#8b2500]">
                  {scanning ? "CAPTURE IN PROGRESS" : "OPTICAL ARMED"}
                </span>
                <span>[ ISO/IEC ]</span>
              </div>

              {/* Outer Biometric Glass Ring Container */}
              <div
                onClick={() => void startFingerScan()}
                className="relative size-44 md:size-52 rounded-full flex items-center justify-center p-2 cursor-pointer group select-none transition-all duration-300"
              >
                {/* Rotating Calibration Track Ring 1 (Clockwise) */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#8b2500]/30 animate-spin-slow-cw pointer-events-none" />

                {/* Rotating Segmented Ring 2 (Counter-Clockwise) */}
                <div className="absolute inset-2 rounded-full border-2 border-dotted border-[#b87333]/40 animate-spin-slow-ccw pointer-events-none" />

                {/* Ambient Outer Pulse Halo */}
                <div
                  className={`absolute inset-3 rounded-full transition-all duration-500 pointer-events-none ${
                    scanning
                      ? "bg-rose-500/15 ring-4 ring-rose-500/30 animate-ping"
                      : "bg-amber-500/10 animate-pulse-ring"
                  }`}
                />

                {/* Central Optical Glass Pod with Matrix Grid */}
                <div className="relative size-full rounded-full cyber-matrix-bg bg-gradient-to-b from-[#fefcf9] via-[#f7efe6] to-[#eddcd0] border-2 border-[#b87333]/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.1),0_8px_25px_rgba(139,37,0,0.15)] flex items-center justify-center overflow-hidden">
                  {/* Targeting Crosshairs */}
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#8b2500]/15 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#8b2500]/15 pointer-events-none" />

                  {/* High-Tech Dual-Way Oscillating Laser Beam */}
                  <div className="absolute inset-x-0 top-0 z-20 pointer-events-none animate-laser-oscillate">
                    {/* Laser Main Core Line */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e,0_0_24px_#f43f5e]" />
                    {/* Volumetric Light Cone */}
                    <div className="h-16 w-full bg-gradient-to-b from-rose-500/30 via-rose-500/10 to-transparent blur-xs" />
                    {/* Center Targeting Reticle Dot */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e] border border-white" />
                  </div>

                  {/* Holographic Breathing Fingerprint Icon */}
                  <Fingerprint
                    className={`size-24 md:size-28 transition-all duration-300 drop-shadow-lg z-10 ${
                      scanning
                        ? "text-rose-600 scale-110 animate-pulse drop-shadow-[0_0_15px_rgba(225,29,72,0.6)]"
                        : "text-[#8b2500] animate-holographic-breathe group-hover:scale-105"
                    }`}
                  />
                </div>
              </div>

              {/* Real-time Telemetry & Frequency Visualizer Bars */}
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4ebe0]/80 border border-[#b87333]/30 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-[#8b2500] uppercase tracking-wider mr-1">
                  FREQ
                </span>
                {[40, 70, 100, 60, 85, 30, 95, 55, 80, 45].map((val, idx) => (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-gradient-to-t from-[#8b2500] to-amber-500"
                    style={{
                      animation: `live-eq-bar ${0.6 + (idx % 4) * 0.25}s ease-in-out infinite alternate`,
                      animationDelay: `${idx * 0.08}s`,
                      height: `${Math.max(4, Math.min(16, val * 0.16))}px`,
                    }}
                  />
                ))}
                <span className="text-[10px] font-mono font-bold text-emerald-700 ml-1">
                  MANTRA ACTIVE
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]">
                {scanning ? "Place Finger on Scanner Glass" : "Place Finger to Authenticate"}
              </h2>
              <p className="text-sm md:text-base text-[#7c533f] font-medium">
                {scanning
                  ? "🟢 Optical sensor active. Place registered finger directly on Mantra glass."
                  : "Mantra optical biometric sensor is armed and ready."}
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left animate-in fade-in duration-200">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button
                size="lg"
                onClick={() => void startFingerScan()}
                disabled={busy}
                className="w-full h-15 text-lg font-bold text-white rounded-2xl shadow-[0_12px_28px_-6px_rgba(139,37,0,0.45)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shimmer-btn cursor-pointer bg-gradient-to-r from-[#4a1c14] via-[#6d2518] to-[#8b2500] border border-amber-500/20"
              >
                {scanning ? (
                  <>
                    <Loader2 className="size-6 animate-spin mr-2" />
                    Scanning Fingerprint...
                  </>
                ) : (
                  <>
                    <Fingerprint className="size-6 mr-2 animate-pulse text-amber-300" />
                    Touch to Scan Fingerprint
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between px-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  <span>{autoDetect ? "Zero-Touch Auto-Sense Active" : "Auto-Sense Paused"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDetect((prev) => !prev)}
                  className="text-[#7c533f] hover:text-[#8b2500] hover:underline transition-colors cursor-pointer"
                >
                  {autoDetect ? "Pause Auto-Sense" : "Resume Auto-Sense"}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e5d8c5]/70 flex items-center justify-center gap-2 text-xs text-[#7c533f]">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Mantra Hardware Biometric Verification</span>
            </div>
          </Card>
        )}

        {/* STEP 2: Student Verified Screen */}
        {step === "service" && student && (
          <div className="w-full max-w-5xl space-y-4 animate-in fade-in zoom-in-95 duration-300 font-sans">
            {/* Top Verified Student Header Banner */}
            <div className="bg-gradient-to-r from-[#4a1c14] via-[#5c2016] to-[#3a140d] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 select-none">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight uppercase text-white">
                  {student.name}
                </h2>
                <p className="text-xs sm:text-sm font-semibold tracking-wider text-amber-200/90 font-mono uppercase">
                  UNIQUE/HR NO.: <span className="font-bold text-white">{student.suid}</span> • {student.class_name || "12 COMMERCE - B"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold h-12 px-5 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="size-4 mr-1.5 text-amber-300" /> Exit
                </Button>
              </div>
            </div>

            {/* Student Location & Details Chips */}
            <div className="flex flex-wrap items-center gap-2 px-1 select-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5d8c5] text-xs font-bold text-[#4a1c14] shadow-xs">
                <Building2 className="size-3.5 text-[#8b2500]" />
                {student.class_name || "11-12 COMMERCE"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5d8c5] text-xs font-bold text-[#4a1c14] shadow-xs">
                Floor: {student.room_no ? `${student.room_no.slice(0, 1)}ND FLOOR` : "2ND FLOOR"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5d8c5] text-xs font-bold text-[#4a1c14] shadow-xs">
                <Key className="size-3.5 text-[#8b2500]" />
                Room {student.room_no || "206"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5d8c5] text-xs font-bold text-[#4a1c14] shadow-xs">
                <Bed className="size-3.5 text-[#8b2500]" />
                Bed {student.room_no ? student.room_no.slice(-2) : "58"}
              </span>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* DIRECT CASHLESS SERVICES GRID */}
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b2500] flex items-center gap-1.5">
                  <Tag className="size-4" /> Available Services
                </h4>
                <span className="text-[11px] text-[#7c533f]">
                  Tap service to select and print thermal receipt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {(config.data?.services ?? []).map((service) => {
                  const meta = getServiceMeta(service.name);
                  const IconComp = meta.icon;

                  return (
                    <button
                      key={service.id}
                      disabled={busy}
                      onClick={() => handleServiceClick(service)}
                      className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-white/95 border-2 border-[#e6d8c6] hover:border-[#8b2500] shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(139,37,0,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-300 text-left flex flex-col justify-between h-40 group relative overflow-hidden cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`size-7 rounded-lg flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110 ${meta.iconBg}`}
                            >
                              <IconComp className="size-3.5" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b2500] bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                              {meta.tag}
                            </span>
                          </div>

                          {service.print_receipt && (
                            <span
                              title="Thermal receipt will be printed"
                              className="p-1.5 rounded-lg bg-[#f7efe6] text-[#7c533f] group-hover:text-[#8b2500] transition-colors"
                            >
                              <Printer className="size-3" />
                            </span>
                          )}
                        </div>

                        <h4 className="text-base sm:text-lg font-bold tracking-tight text-[#2d140d] group-hover:text-[#8b2500] transition-colors line-clamp-2 leading-snug font-sans">
                          {service.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#f2e7db] mt-1">
                        {service.price === 0 ? (
                          <span className="text-sm font-extrabold text-[#8b2500] tracking-tight font-sans">
                            Manual Amount
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-base font-bold text-[#8b2500]">₹</span>
                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#2d140d] font-sans">
                              {service.price}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8b2500] to-amber-700 text-white font-bold text-xs shadow-xs group-hover:shadow-md group-hover:from-[#a32c00] group-hover:to-amber-600 transition-all">
                          <span>Pay</span>
                          <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Custom Amount Numpad Dialog */}
      <Dialog open={Boolean(customService)} onOpenChange={(open) => !open && setCustomService(null)}>
        <DialogContent className="max-w-sm p-6 bg-[#fdfbf7] border-2 border-[#e5d8c5] rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-sans text-xl font-extrabold text-[#2d140d] tracking-tight">
              {customService?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Amount Display */}
          <div className="my-3 rounded-2xl bg-white border-2 border-[#d8c5af] p-4 text-center shadow-xs">
            <span className="text-xs font-bold text-[#7c533f] uppercase tracking-wider block">Total Amount</span>
            <div className="text-4xl sm:text-5xl font-sans font-black text-[#2d140d] mt-1 tracking-tight">
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
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f2e5d5] hover:bg-[#8b2500] hover:text-white text-[#6b4a3a] border border-[#d8c5af] transition-all cursor-pointer font-sans"
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
                className="h-14 rounded-2xl text-2xl font-bold font-sans bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#2d140d] transition-all flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-14 rounded-2xl text-base font-bold font-sans bg-rose-50 hover:bg-rose-100 active:scale-95 border-2 border-rose-200 text-rose-700 transition-all flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDigit("0")}
              className="h-14 rounded-2xl text-2xl font-bold font-sans bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#2d140d] transition-all flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-14 rounded-2xl text-lg font-bold bg-amber-50 hover:bg-amber-100 active:scale-95 border-2 border-amber-200 text-amber-800 transition-all flex items-center justify-center cursor-pointer"
            >
              <Delete className="size-6" />
            </button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomService(null)}
              className="w-full sm:w-auto rounded-xl border-[#d8c5af] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || Number(customAmountStr) <= 0}
              onClick={() => customService && executePunch(customService.id, Number(customAmountStr))}
              className="w-full sm:flex-1 h-12 text-base font-bold bg-[#4a1c14] hover:bg-[#8b2500] text-white rounded-xl shadow-lg cursor-pointer"
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
        <span>Shree Swaminarayan Gurukul, Rajkot · Cashless Biometric Terminal</span>
        <span className="hidden sm:inline">|</span>
        <span className="font-semibold text-[#6b4a3a]">Mantra Optical Biometric Scanner</span>
      </footer>

      {/* Hidden Thermal Slip - Active During window.print() */}
      {activeReceipt && (
        <div className="hidden print:block">
          <ReceiptSlip
            title={title}
            receipt={activeReceipt}
            footerText={footerText}
          />
        </div>
      )}
    </div>
  );
}
