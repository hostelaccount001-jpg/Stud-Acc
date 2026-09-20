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
  Search,
  User,
  Cpu,
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
  nfc_no?: string | undefined;
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
                nfc_no: matched.nfc_no,
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
        nfc_no: matched.nfc_no,
        templates: matched.templates || [],
      };

      setStudent(verified);
      setSuccessBanner(`Biometric Verified: Welcome, ${verified.name}!`);
      setStep("service");
    } catch {
      setError("Communication error with Mantra MFS100 scanner. Check USB connection and driver.");
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
          nfc: student.nfc_no,
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

            {/* Glowing Biometric Scanner Ring */}
            <div
              onClick={() => void startFingerScan()}
              className="relative mx-auto size-40 md:size-48 rounded-full bg-gradient-to-b from-[#fdfbf7] to-[#f4ebe0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner animate-pulse-ring overflow-hidden group cursor-pointer hover:border-[#8b2500] transition-colors"
            >
              {/* Animated Laser Scanning Beam */}
              <div className="absolute inset-x-0 top-0 z-10 pointer-events-none animate-laser">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
                <div className="h-14 w-full bg-gradient-to-b from-rose-500/25 to-transparent blur-sm" />
              </div>

              <Fingerprint
                className={`size-24 md:size-28 text-[#8b2500] transition-all duration-300 drop-shadow-md ${
                  scanning ? "scale-110 text-rose-600 animate-pulse" : "group-hover:scale-105"
                }`}
              />

              {scanning && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-500 animate-ping opacity-40" />
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]">
                {scanning ? "Place Finger on Scanner Glass" : "Place Finger to Authenticate"}
              </h2>
              <p className="text-sm md:text-base text-[#7c533f] font-medium">
                {scanning
                  ? "🟢 Optical sensor active. Place registered finger directly on Mantra glass."
                  : "Mantra MFS100 optical biometric sensor is armed and ready."}
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
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2 text-amber-300" />
                    Verifying Biometrics...
                  </>
                ) : scanning ? (
                  <>
                    <span className="size-3 rounded-full bg-emerald-400 animate-ping mr-2.5" />
                    Auto-Sense Active: Touch Sensor
                  </>
                ) : (
                  <>
                    <Fingerprint className="size-5 mr-2 text-amber-300" />
                    Touch to Scan Fingerprint
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between px-2 text-xs text-[#7c533f]">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Zero-Touch Auto-Sense Active
                </span>
                <button
                  type="button"
                  onClick={() => setAutoDetect((prev) => !prev)}
                  className="font-bold text-[#8b2500] hover:underline cursor-pointer"
                >
                  {autoDetect ? "Pause Auto-Sense" : "Enable Auto-Sense"}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#8b6553]">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Mantra MFS100 Hardware Biometric Verification</span>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2: Service Selection Grid */}
        {step === "service" && student && (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Verified Student Banner */}
            <Card className="p-5 bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-lg rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 flex items-center justify-center font-serif font-bold text-xl">
                  {student.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#4a1c14]">{student.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/15 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Biometric Verified
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#7c533f] mt-0.5">
                    SUID: <span className="font-bold text-[#4a1c14]">{student.suid}</span>
                    {student.class_name ? ` • Class: ${student.class_name}` : ""}
                    {student.room_no ? ` • Room: ${student.room_no}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="rounded-xl border-[#d8c5af] text-[#6b4a3a] hover:bg-[#f5ecdf] cursor-pointer"
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

            {/* Services Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {(config.data?.services ?? []).map((service) => (
                <button
                  key={service.id}
                  disabled={busy}
                  onClick={() => handleServiceClick(service)}
                  className="p-6 rounded-2xl bg-white/95 border-2 border-[#e5d8c5] shadow-md hover:shadow-xl hover:border-[#8b2500] active:scale-95 transition-all text-left flex flex-col justify-between h-40 group relative overflow-hidden cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8b2500]">
                        Service
                      </span>
                      {service.print_receipt && (
                        <Printer className="size-4 text-[#7c533f] group-hover:text-[#8b2500]" />
                      )}
                    </div>
                    <h4 className="text-lg md:text-xl font-serif font-bold text-[#4a1c14] group-hover:text-[#8b2500] line-clamp-2">
                      {service.name}
                    </h4>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-[#f0e6d8]">
                    <span className="text-2xl md:text-3xl font-mono font-black text-[#4a1c14]">
                      {service.price === 0 ? "Manual Amount" : `₹${service.price}`}
                    </span>
                    <span className="text-xs font-bold text-[#8b2500] group-hover:translate-x-1 transition-transform">
                      Select →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Custom Amount Numpad Dialog */}
      <Dialog open={Boolean(customService)} onOpenChange={(open) => !open && setCustomService(null)}>
        <DialogContent className="max-w-sm p-5 bg-[#fdfbf7] border-2 border-[#e5d8c5] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-xl font-bold text-[#4a1c14]">
              {customService?.name}
            </DialogTitle>
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
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f2e5d5] hover:bg-[#8b2500] hover:text-white text-[#6b4a3a] border border-[#d8c5af] transition-all cursor-pointer"
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
                className="h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-14 rounded-2xl text-lg font-bold bg-rose-50 hover:bg-rose-100 active:scale-95 border-2 border-rose-200 text-rose-700 transition-all flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDigit("0")}
              className="h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center cursor-pointer"
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
        <span className="font-semibold text-[#6b4a3a]">Mantra MFS100 STQC Optical Scanner</span>
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
