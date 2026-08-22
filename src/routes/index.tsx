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
} from "lucide-react";
import {
  getKioskConfig,
  identifyStudentByFingerprint,
  lookupStudent,
  punchService,
} from "@/lib/kiosk.functions";
import { captureFinger } from "@/lib/mantra";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gurukul Kiosk — Tap & Print Terminal" },
      {
        name: "description",
        content: "Self-service cashless payment terminal with Mantra fingerprint, NFC card and touch keypad amount entry.",
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
  const [step, setStep] = useState<Step>("finger");
  const [capturedScan, setCapturedScan] = useState<CapturedScan | null>(null);
  const [detectedStudent, setDetectedStudent] = useState<VerifiedStudent | null>(null);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [nfc, setNfc] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Background printing receipt container
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Custom Amount Numpad Modal State
  const [customService, setCustomService] = useState<ServiceItem | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>("0");

  const cardInputRef = useRef<HTMLInputElement>(null);

  const getConfig = useServerFn(getKioskConfig);
  const identifyFn = useServerFn(identifyStudentByFingerprint);
  const lookup = useServerFn(lookupStudent);
  const punch = useServerFn(punchService);

  const config = useQuery({
    queryKey: ["kiosk-config"],
    queryFn: () => getConfig(),
    refetchInterval: 30000,
  });

  const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Service Kiosk";
  const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";

  useEffect(() => {
    if (step === "card") {
      const t = setTimeout(() => cardInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step]);

  // Instant Auto-submit NFC card when scanned by card reader (any length digits/chars)
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
    setStep("finger");
    setCapturedScan(null);
    setDetectedStudent(null);
    setStudent(null);
    setNfc("");
    setError("");
    setCustomService(null);
    setCustomAmountStr("0");
  }

  // STEP 1: Scan Fingerprint on Mantra MFS110 & Identify Registered Student
  async function startFingerScan() {
    setScanning(true);
    setError("");
    setSuccessBanner(null);
    try {
      const capture = await captureFinger(60, 10);
      if (!capture.ok) {
        setError(capture.error || "Failed to capture fingerprint. Please try again.");
        return;
      }

      setCapturedScan({
        template: capture.template,
        quality: capture.quality,
        serial: capture.serial,
        at: new Date().toISOString(),
      });

      // 1:N Biometric Identification in database
      const ident = await identifyFn({
        data: {
          probeTemplate: capture.template,
          quality: capture.quality,
        },
      });

      if (ident.status === "not_found") {
        setError("Fingerprint not recognized. Please enroll this student in the Admin Portal first.");
        return;
      }

      setDetectedStudent({
        studentId: ident.studentId,
        suid: ident.suid,
        name: ident.name,
        nfc_no: ident.nfc_no,
        class_name: ident.class_name,
        room_no: ident.room_no,
      });

      // Advance to Step 2 (NFC Card Tap)
      setStep("card");
    } catch {
      setError("Biometric communication error. Please place your finger firmly on the Mantra sensor and try again.");
    } finally {
      setScanning(false);
    }
  }

  // STEP 2: Verify NFC Card matches the Detected Student's NFC
  async function submitCard(value: string) {
    const code = value.trim();
    if (!code) return;

    if (!detectedStudent) {
      setError("Please scan your fingerprint on the Mantra sensor in Step 1 first.");
      setStep("finger");
      return;
    }

    // STRICT CROSS-CHECK: Tapped NFC card MUST belong to the student identified by fingerprint!
    if (code !== detectedStudent.nfc_no) {
      setError(`🚨 Card Mismatch! This card does NOT belong to ${detectedStudent.name}. Please tap ${detectedStudent.name}'s registered card.`);
      setNfc("");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await lookup({
        data: {
          nfc: code,
        },
      });

      if (res.status === "not_found") {
        setError("NFC card is not registered in the system. Please contact the office.");
        setNfc("");
        return;
      }

      if (res.status === "blocked") {
        setError(`Card Blocked: ${res.message}`);
        setNfc("");
        return;
      }

      if (res.status === "no_fingerprint") {
        setError(res.message);
        setNfc("");
        return;
      }

      // Valid student verified: Both Fingerprint and NFC Card belong to the exact same student!
      setStudent(detectedStudent);

      // Advance to Step 3 (Services)
      setStep("service");
    } catch {
      setError("Terminal verification error. Please try tapping your card again.");
    } finally {
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
        // Trigger immediate print if service has printing enabled
        if (res.print && res.receipt) {
          setActiveReceipt(res.receipt);
          setTimeout(() => {
            try {
              window.print();
            } catch (e) {
              console.error("Print trigger failed:", e);
            }
          }, 80);
        }

        // Show immediate success message
        setSuccessBanner(
          `✅ Paid ₹${res.receipt?.amount ?? amount} for ${res.receipt?.service}! Receipt printed for ${studentName}.`,
        );

        // DIRECTLY RESET TO STEP 1 FOR NEXT STUDENT (No extra screens or manual clicks!)
        reset();
      } else if (res.status === "blocked") {
        setError(res.message);
      } else if (res.status === "limit") {
        setError(res.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process service transaction");
    } finally {
      setBusy(false);
    }
  }

  // Touch Keypad Input Handlers
  function handleKeypadDigit(digit: string) {
    if (customAmountStr === "0") {
      setCustomAmountStr(digit);
    } else if (customAmountStr.length < 5) {
      setCustomAmountStr(customAmountStr + digit);
    }
  }

  function handleKeypadBackspace() {
    if (customAmountStr.length <= 1) {
      setCustomAmountStr("0");
    } else {
      setCustomAmountStr(customAmountStr.slice(0, -1));
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
    <div className="min-h-screen bg-[#faf6ef] text-[#2c1810] flex flex-col justify-between p-6 md:p-10 font-sans select-none">
      {/* Hidden Print Slip DOM for Direct Printing */}
      {activeReceipt && (
        <ReceiptSlip
          title={title}
          footerText={footerText}
          receipt={activeReceipt}
        />
      )}

      {/* Top Header */}
      <header className="relative text-center space-y-2 py-4">
        {/* Top Left Logo (Click opens Admin Portal) */}
        <Link
          to="/admin"
          title="Open Admin Portal"
          className="absolute left-0 top-0 transition-transform hover:scale-105 active:scale-95 group"
        >
          <img
            src="/logo.png"
            alt="Shree Swaminarayan Gurukul Rajkot Logo"
            className="size-16 md:size-20 rounded-2xl object-contain bg-white p-1.5 shadow-lg border border-amber-400/40 group-hover:border-[#8b2500]/60 transition-colors"
          />
        </Link>

        {/* Top Center Title & Subtitle */}
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-serif font-bold tracking-tight text-[#4a1c14] drop-shadow-sm whitespace-nowrap">
            {title}
          </h1>
          <p className="text-sm md:text-base font-medium text-[#7c533f] tracking-wide mt-1">
            {subtitle}
          </p>
        </div>

        {/* 3-Step Flow Indicator */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === "finger"
                ? "bg-[#4a1c14] text-white shadow-md scale-105"
                : capturedScan
                  ? "bg-emerald-600/15 text-emerald-800 border border-emerald-500/30"
                  : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            {capturedScan ? <CheckCircle2 className="size-3.5" /> : null} 1. Fingerprint
          </span>
          <span className="text-[#c5a880]">——</span>
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === "card"
                ? "bg-[#4a1c14] text-white shadow-md scale-105"
                : student
                  ? "bg-emerald-600/15 text-emerald-800 border border-emerald-500/30"
                  : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            {student ? <CheckCircle2 className="size-3.5" /> : null} 2. NFC Card
          </span>
          <span className="text-[#c5a880]">——</span>
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === "service"
                ? "bg-[#4a1c14] text-white shadow-md scale-105"
                : "bg-[#ebdcc8] text-[#7c533f]"
            }`}
          >
            3. Service
          </span>
        </div>
      </header>

      {/* Instant Success Flash Notification */}
      {successBanner && (
        <div className="max-w-xl mx-auto w-full p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-center gap-3 text-center text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="size-6 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Main Terminal Stage */}
      <main className="flex-1 flex items-center justify-center my-4">
        {/* STEP 1: Scan Fingerprint on Mantra MFS110 */}
        {step === "finger" && (
          <Card className="w-full max-w-xl p-8 md:p-12 text-center bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-2xl rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mx-auto size-32 rounded-full bg-[#fdf8f0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner">
              <Fingerprint
                className={`size-16 text-[#8b2500] transition-all duration-300 ${
                  scanning ? "animate-pulse scale-110 text-rose-600" : ""
                }`}
              />
              {scanning && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-500 animate-ping opacity-30" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]">
                Step 1: Scan Your Fingerprint
              </h2>
              <p className="text-sm md:text-base text-[#7c533f]">
                {scanning
                  ? "Place your finger firmly on the Mantra scanner sensor now..."
                  : "Touch the sensor on the Mantra scanner to identify your student account."}
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <Button
              size="lg"
              onClick={startFingerScan}
              disabled={scanning}
              className="w-full h-14 text-base font-semibold bg-[#4a1c14] hover:bg-[#6b2c1a] text-white rounded-2xl shadow-lg transition-transform active:scale-[0.98]"
            >
              {scanning ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Scanning finger on Mantra MFS110...
                </>
              ) : (
                <>
                  <Fingerprint className="size-5 mr-2" />
                  Touch to Scan Fingerprint
                </>
              )}
            </Button>
          </Card>
        )}

        {/* STEP 2: NFC Card Tap */}
        {step === "card" && (
          <Card className="w-full max-w-xl p-8 md:p-12 text-center bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-2xl rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Student Identified Banner */}
            {detectedStudent && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#8b2500]/10 via-amber-500/15 to-[#8b2500]/10 border border-amber-500/30 text-center space-y-1 shadow-sm">
                <div className="text-[11px] uppercase font-bold tracking-wider text-[#8b2500] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="size-4 text-[#8b2500]" /> Student Identified by Fingerprint
                </div>
                <div className="text-xl md:text-2xl font-serif font-bold text-[#4a1c14]">
                  {detectedStudent.name}
                </div>
                <div className="text-xs font-mono text-[#7c533f]">
                  SUID: <span className="font-bold text-[#4a1c14]">{detectedStudent.suid}</span>
                  {detectedStudent.class_name ? ` • Class: ${detectedStudent.class_name}` : ""}
                </div>
              </div>
            )}

            <div className="mx-auto size-28 rounded-full bg-[#fdf8f0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner">
              <CreditCard className="size-14 text-[#8b2500] animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]">
                Step 2: Tap Your NFC Card
              </h2>
              <p className="text-sm md:text-base text-[#7c533f]">
                {detectedStudent ? (
                  <>
                    Please tap the registered Smart Card for{" "}
                    <strong className="text-[#4a1c14] font-bold">{detectedStudent.name}</strong> on the ID TECH reader.
                  </>
                ) : (
                  <>Place your smart card on the card reader to open your account.</>
                )}
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left">
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
                placeholder="Tap card on reader or enter card no..."
                value={nfc}
                onChange={(e) => setNfc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nfc.trim()) {
                    e.preventDefault();
                    void submitCard(nfc);
                  }
                }}
                className="h-14 text-center font-mono text-lg font-bold bg-[#fdfbf7] border-[#d8c5af] rounded-2xl focus-visible:ring-[#8b2500]"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                  className="flex-1 h-12 rounded-xl border-[#d8c5af] text-[#6b4a3a]"
                >
                  <RefreshCw className="size-4 mr-2" /> Start Over
                </Button>
                <Button
                  type="submit"
                  disabled={busy || !nfc.trim()}
                  className="flex-1 h-12 font-semibold bg-[#4a1c14] hover:bg-[#6b2c1a] text-white rounded-xl"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : "Verify Card"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* STEP 3: Service Selection Grid */}
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
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/15 text-emerald-800 border border-emerald-500/30">
                      Verified
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
