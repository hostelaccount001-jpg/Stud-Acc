import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  HelpCircle,
  Usb,
  ExternalLink,
  Terminal,
  ShieldAlert,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  CreditCard,
  ShoppingBag,
  Scissors,
  HeartPulse,
  LogOut,
  ChevronRight,
  History,
  Tag,
  Hash,
  Coins,
} from "lucide-react";
import {
  captureFinger,
  identify,
  useMantraDevice,
  findDevice,
} from "@/lib/mantra";
import {
  getKioskConfig,
  punchService,
  getStudentGallery,
  getStudentLedger,
} from "@/lib/kiosk.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Gurukul Kiosk — Direct Mantra MFS 100 Fingerprint Biometric Terminal",
      },
      {
        name: "description",
        content: "Self-service cashless payment terminal with direct Mantra MFS 100 biometric authentication and instant student wallet ledger.",
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

type LedgerItem = {
  id: string;
  receipt_no: number;
  service_name: string;
  amount: number;
  created_at: string;
  service_id?: string | null;
  type: "Credit" | "Debit";
  balanceAfter?: number;
};

// Map service names to clean icons
function getServiceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("hair") || lower.includes("cutting")) return Scissors;
  if (lower.includes("store") || lower.includes("canteen") || lower.includes("shop")) return ShoppingBag;
  if (lower.includes("medical") || lower.includes("doctor") || lower.includes("clinic")) return HeartPulse;
  if (lower.includes("jayanti") || lower.includes("hari")) return Sparkles;
  if (lower.includes("deposit") || lower.includes("credit") || lower.includes("sbi")) return Coins;
  return CreditCard;
}

function Kiosk() {
  const [step, setStep] = useState<Step>("scan");
  const [capturedScan, setCapturedScan] = useState<CapturedScan | null>(null);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [error, setError] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Student Ledger & Wallet state
  const [studentTransactions, setStudentTransactions] = useState<LedgerItem[]>([]);

  // Auto-reset countdown timer (seconds)
  const [resetCountdown, setResetCountdown] = useState<number>(60);

  // Background printing receipt container
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Custom Amount Numpad Modal State
  const [customService, setCustomService] = useState<ServiceItem | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>("0");

  // Zero-Touch Auto-Detect Mode: Mantra MFS 100 continuously listens for finger touch
  const [autoDetect, setAutoDetect] = useState<boolean>(true);

  // Mantra MFS 100 Scanner Help & Troubleshooting Modal
  const [showMantraHelp, setShowMantraHelp] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  const getConfig = useServerFn(getKioskConfig);
  const punch = useServerFn(punchService);
  const getGallery = useServerFn(getStudentGallery);
  const getLedgerFn = useServerFn(getStudentLedger);

  // Live Mantra MFS 100 device status
  const { device, checking: deviceChecking, isConnected } = useMantraDevice(3000);

  // Kiosk settings & services query
  const config = useQuery({
    queryKey: ["kiosk-config"],
    queryFn: () => getConfig(),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Cached biometric student gallery for instant 1:N match
  const galleryQuery = useQuery({
    queryKey: ["kiosk-gallery"],
    queryFn: () => getGallery(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Biometric Kiosk Terminal";
  const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";

  // Test Mantra MFS 100 Hardware connection
  async function testMantraConnection() {
    setTestingConnection(true);
    try {
      const dev = await findDevice();
      if (dev) {
        toast.success(`Mantra MFS 100 scanner connected successfully!`, {
          description: `Device serial: ${dev.serial || "Ready"} on port ${dev.port}`,
        });
        setShowMantraHelp(false);
      } else {
        toast.error("Mantra MFS 100 not detected yet.", {
          description: "Please check Start-Mantra-Bridge.bat or allow Insecure Content in Chrome.",
        });
      }
    } catch {
      toast.error("Unable to probe scanner. Please verify local bridge.");
    } finally {
      setTestingConnection(false);
    }
  }

  // Reset function to clear session and return to Step 1
  const reset = useCallback(() => {
    setStep("scan");
    setCapturedScan(null);
    setStudent(null);
    setStudentTransactions([]);
    setError("");
    setCustomService(null);
    setCustomAmountStr("0");
    setScanning(false);
    setBusy(false);
    setResetCountdown(60);
  }, []);

  // Auto-dismiss success banner
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successBanner]);

  // Concurrent Fetching: Load Student Wallet, Ledger & Services instantly via Promise.all
  const loadStudentRecords = useCallback(async (studentId: string) => {
    setLoadingStudentData(true);
    try {
      // Fetch transactions & settings concurrently with Promise.all
      const [ledgerRes, directTxRes] = await Promise.allSettled([
        getLedgerFn({ data: { studentId } }),
        supabase
          .from("transactions")
          .select("id, receipt_no, amount, service_name, created_at, service_id")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(35),
      ]);

      let rawRows: any[] = [];
      if (ledgerRes.status === "fulfilled" && ledgerRes.value?.transactions) {
        rawRows = ledgerRes.value.transactions;
      } else if (directTxRes.status === "fulfilled" && directTxRes.value?.data) {
        rawRows = directTxRes.value.data;
      }

      // Process ledger items
      const processed: LedgerItem[] = rawRows.map((tx) => {
        const isCredit =
          tx.service_name?.toLowerCase().includes("deposit") ||
          tx.service_name?.toLowerCase().includes("credit") ||
          tx.service_name?.toLowerCase().includes("sbi") ||
          Number(tx.amount) < 0;

        return {
          id: tx.id,
          receipt_no: tx.receipt_no,
          service_name: tx.service_name,
          amount: Math.abs(Number(tx.amount)),
          created_at: tx.created_at,
          service_id: tx.service_id,
          type: isCredit ? "Credit" : "Debit",
        };
      });

      setStudentTransactions(processed);
    } catch (err) {
      console.error("Failed to load student wallet ledger:", err);
    } finally {
      setLoadingStudentData(false);
    }
  }, [getLedgerFn]);

  // Compute Wallet Statistics with useMemo to eliminate performance lag
  const walletMetrics = useMemo(() => {
    let totalCredit = 0;
    let totalUsed = 0;

    studentTransactions.forEach((tx) => {
      if (tx.type === "Credit") {
        totalCredit += tx.amount;
      } else {
        totalUsed += tx.amount;
      }
    });

    // Provide baseline student balance credit if no deposit rows exist yet in demo
    const baseCredit = totalCredit > 0 ? totalCredit : 2500;
    const availableBalance = Math.max(0, baseCredit - totalUsed);

    return {
      totalCredit: baseCredit,
      totalUsed,
      availableBalance,
      totalTransactions: studentTransactions.length,
    };
  }, [studentTransactions]);

  // Compute Running Balance for each Ledger Item
  const ledgerWithRunningBalance = useMemo(() => {
    let current = walletMetrics.availableBalance;
    // Walk down history calculating prior balance
    return studentTransactions.map((tx) => {
      const rowBalance = current;
      if (tx.type === "Debit") {
        current += tx.amount;
      } else {
        current -= tx.amount;
      }
      return {
        ...tx,
        balanceAfter: rowBalance,
      };
    });
  }, [studentTransactions, walletMetrics.availableBalance]);

  // Inactivity Auto-Reset Countdown when on Post-Scan view
  useEffect(() => {
    if (step !== "service") return;

    const timer = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          reset();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, reset]);

  // AUTO-DETECT: Zero-Touch Continuous Biometric Sensing Loop for Mantra MFS 100
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
          // Listen on Mantra MFS 100 sensor
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

            // Fast 1:N match across enrolled students
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
              setResetCountdown(60);

              // Instantly fetch student wallet & ledger
              void loadStudentRecords(verified.id);
              break;
            } else {
              setError("❌ Fingerprint not recognized. Please place your registered finger firmly on the Mantra MFS 100 sensor.");
              setBusy(false);
              await new Promise((resolve) => setTimeout(resolve, 2500));
              if (!cancelled) setError("");
            }
          } else {
            // Pause 200ms and continue next cycle
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
  }, [step, autoDetect, isConnected, busy, galleryQuery.data, loadStudentRecords]);

  // STEP 1: Direct Fingerprint Scan & 1:N Identification (Manual Button Fallback)
  async function startFingerScan() {
    if (scanning || busy) return;

    if (!isConnected) {
      setShowMantraHelp(true);
      setError("Mantra MFS 100 scanner is not connected. Click above or view connection assistant.");
      return;
    }

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
        setError("Student gallery is loading. Please retry in a moment.");
        setBusy(false);
        setScanning(false);
        return;
      }

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
        setResetCountdown(60);

        // Fetch wallet ledger concurrently
        void loadStudentRecords(verified.id);
      } else {
        setError("❌ Fingerprint not recognized. Please place registered finger firmly on the Mantra MFS 100 sensor.");
      }
    } catch {
      setError("Communication failed with Mantra MFS 100. Please verify bridge service.");
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  // STEP 2: Service Selection & Cashless Checkout
  function handleServiceClick(service: ServiceItem) {
    // If service has price 0 or custom pricing, open numpad modal
    if (service.price <= 0) {
      setCustomService(service);
      setCustomAmountStr("0");
    } else {
      // Direct Cashless Deduction
      void executePunch(service.id, service.price);
    }
  }

  // Execute Service Punch & Real-Time Ledger Update
  async function executePunch(serviceId: string, amount?: number) {
    if (!student) return;
    setBusy(true);
    setError("");
    const studentName = student.name;
    const targetService = (config.data?.services ?? []).find((s) => s.id === serviceId);

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

        // Optimistic Ledger Update
        const deductedAmount = amount ?? targetService?.price ?? 0;
        const newLedgerItem: LedgerItem = {
          id: `opt-${Date.now()}`,
          receipt_no: res.receipt?.receiptNo ?? Math.floor(10000 + Math.random() * 90000),
          service_name: targetService?.name ?? "Cashless Service",
          amount: deductedAmount,
          created_at: new Date().toISOString(),
          service_id: serviceId,
          type: "Debit",
        };

        setStudentTransactions((prev) => [newLedgerItem, ...prev]);

        // Trigger receipt print if enabled
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

          setTimeout(() => {
            window.print();
          }, 300);
        }

        // Close custom dialog if open
        setCustomService(null);
        setCustomAmountStr("0");

        // Reset countdown timer
        setResetCountdown(25);
      } else if (res.status === "blocked") {
        setError(`❌ Student Account Blocked: ${res.message}`);
      } else if (res.status === "limit") {
        setError(`⚠️ Daily Limit Exceeded: ${res.message}`);
      } else {
        setError("❌ Transaction failed. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Transaction error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Touch Keypad Handlers for Custom Amount
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
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#1e0f09] via-[#2c130b] to-[#120805] text-[#faf6ef] p-3 sm:p-5 md:p-8 select-none relative overflow-x-hidden font-sans">
      {/* Ambient Lighting Gradients */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent blur-3xl pointer-events-none animate-pulse" />
      <div
        className="absolute -bottom-32 -right-32 size-96 rounded-full bg-gradient-to-tl from-[#8b2500]/25 to-transparent blur-3xl pointer-events-none"
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

      {/* Top Header & Branding Bar */}
      <header className="relative flex items-center justify-between pb-3 border-b border-white/10 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/auth"
            title="Open Admin Login Portal"
            className="transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer shrink-0"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-[#8b2500] opacity-50 blur-sm group-hover:opacity-100 transition duration-300" />
              <img
                src="/logo.png"
                alt="Gurukul Logo"
                className="relative size-12 sm:size-14 rounded-2xl object-contain bg-white p-1 shadow-xl border border-amber-400/50"
              />
            </div>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                Shree Swaminarayan Gurukul, Rajkot
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                MFS 100 Armed
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-serif font-black tracking-tight text-white drop-shadow-sm">
              {title}
            </h1>
          </div>
        </div>

        {/* Right Header Status / Reset */}
        <div className="flex items-center gap-2 sm:gap-3">
          {step === "service" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-400 animate-pulse" />
                Reset in {resetCountdown}s
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="h-9 px-3 rounded-xl border-amber-500/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs gap-1.5 cursor-pointer"
              >
                <LogOut className="size-3.5 text-rose-400" /> Finish / Exit
              </Button>
            </div>
          )}

          {step === "scan" && (
            <button
              type="button"
              onClick={() => setShowMantraHelp(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-sm ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : deviceChecking
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : deviceChecking ? "bg-amber-400" : "bg-rose-400"
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? "Mantra MFS 100 Ready" : deviceChecking ? "Checking..." : "Mantra Scanner Help"}
              </span>
              <span className="sm:hidden">{isConnected ? "Ready" : "Offline"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Success Notification Flash Banner */}
      {successBanner && (
        <div className="max-w-xl mx-auto w-full p-3.5 my-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 text-white shadow-2xl flex items-center justify-center gap-3 text-center text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-3 duration-300 z-30">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-200" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Main Container Stage */}
      <main className="flex-1 flex items-center justify-center my-3 relative z-10">
        {/* ========================================================================= */}
        {/* VIEW 1: AUTHENTICATION / SCAN STAGE */}
        {/* ========================================================================= */}
        {step === "scan" && (
          <Card className="w-full max-w-lg p-6 sm:p-10 text-center bg-[#25100a]/90 backdrop-blur-2xl border-2 border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Status Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30 uppercase tracking-wider">
                <Sparkles className="size-3.5 text-amber-400 animate-spin" />
                Mantra MFS 100 Biometric Kiosk
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-white pt-1">
                Place Finger to Authenticate
              </h2>
              <p className="text-xs sm:text-sm text-white/70">
                Touch your registered thumb or finger on the Mantra MFS 100 optical glass sensor.
              </p>
            </div>

            {/* High-Tech Biometric HUD Scanner Radar */}
            <div className="relative mx-auto w-60 sm:w-68 flex flex-col items-center py-2">
              {/* Corner HUD Reticles */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-400/60 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-amber-400/60 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-6 left-0 w-5 h-5 border-b-2 border-l-2 border-amber-400/60 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-6 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-400/60 rounded-br-sm pointer-events-none" />

              {/* HUD Telemetry Top Info */}
              <div className="w-full flex justify-between items-center px-1 mb-2 text-[10px] font-mono tracking-widest text-amber-400 font-bold select-none">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  [ 500 DPI ]
                </span>
                <span className="tracking-wider uppercase">
                  {scanning ? "READING SENSOR" : "OPTICAL ARMED"}
                </span>
                <span>[ ISO/IEC ]</span>
              </div>

              {/* Optical Glass Pod Container */}
              <div
                onClick={() => void startFingerScan()}
                className="relative size-44 sm:size-50 rounded-full flex items-center justify-center p-2 cursor-pointer group select-none transition-all duration-300"
              >
                {/* Rotating Rings */}
                <div className="absolute inset-0 rounded-full border border-dashed border-amber-400/30 animate-spin-slow-cw pointer-events-none" />
                <div className="absolute inset-2 rounded-full border-2 border-dotted border-[#8b2500]/50 animate-spin-slow-ccw pointer-events-none" />

                {/* Ambient Aura */}
                <div
                  className={`absolute inset-3 rounded-full transition-all duration-500 pointer-events-none ${
                    scanning
                      ? "bg-rose-500/25 ring-4 ring-rose-500/40 animate-ping"
                      : "bg-amber-500/15 animate-pulse"
                  }`}
                />

                {/* Central Optical Core */}
                <div className="relative size-full rounded-full bg-gradient-to-b from-[#3a150c] via-[#240b05] to-[#120502] border-2 border-amber-500/60 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8),0_10px_30px_rgba(139,37,0,0.5)] flex items-center justify-center overflow-hidden">
                  {/* High-Tech Oscillating Laser Line */}
                  <div className="absolute inset-x-0 top-0 z-20 pointer-events-none animate-laser-oscillate">
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#fbbf24]" />
                    <div className="h-14 w-full bg-gradient-to-b from-amber-400/25 to-transparent blur-xs" />
                  </div>

                  {/* Fingerprint Icon */}
                  <Fingerprint
                    className={`size-24 sm:size-28 transition-all duration-300 drop-shadow-xl z-10 ${
                      scanning
                        ? "text-rose-400 scale-110 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]"
                        : "text-amber-400 animate-holographic-breathe group-hover:scale-105"
                    }`}
                  />
                </div>
              </div>

              {/* Freq telemetry */}
              <div className="mt-2.5 flex items-center gap-1 px-3 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono text-amber-300">
                <span>FREQ: 500 DPI</span>
                <span className="mx-1">•</span>
                <span>MANTRA MFS100 ACTIVE</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-2.5 text-left animate-in fade-in">
                <AlertCircle className="size-5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Scan Action Button */}
            <div className="space-y-3 pt-1">
              <Button
                size="lg"
                onClick={() => void startFingerScan()}
                disabled={busy}
                className="w-full h-14 text-base sm:text-lg font-bold text-white rounded-2xl shadow-[0_12px_28px_-6px_rgba(139,37,0,0.6)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer bg-gradient-to-r from-[#8b2500] via-[#b83200] to-amber-700 hover:from-[#a32c00] hover:to-amber-600 border border-amber-400/30"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2 text-amber-300" />
                    Matching Biometrics...
                  </>
                ) : scanning ? (
                  <>
                    <span className="size-3 rounded-full bg-emerald-400 animate-ping mr-2.5" />
                    Scanning Fingerprint...
                  </>
                ) : (
                  <>
                    <Fingerprint className="size-5 mr-2 text-amber-300" />
                    Touch to Scan Fingerprint
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs text-white/70 px-1">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-3.5" /> Auto-Sense Ready
                </span>
                <button
                  type="button"
                  onClick={() => setAutoDetect((prev) => !prev)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  {autoDetect ? "Pause Auto-Sense" : "Enable Auto-Sense"}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: DUAL-PANEL POST-SCAN VIEW (SPLIT LAYOUT) */}
        {/* ========================================================================= */}
        {step === "service" && student && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in zoom-in-98 duration-300">
            {/* ------------------------------------------------------------------- */}
            {/* LEFT PANEL: STUDENT WALLET & TRANSACTION LEDGER (5 COLS) */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
              {/* Student Identification Card */}
              <Card className="p-4 sm:p-5 bg-[#25100a]/90 backdrop-blur-xl border border-amber-500/30 shadow-xl rounded-3xl space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-[#8b2500] to-amber-600 text-white flex items-center justify-center font-serif font-black text-2xl shadow-md border border-amber-400/40 shrink-0">
                    {student.name[0]?.toUpperCase() || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-serif font-black text-white truncate">
                        {student.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Verified
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5 text-xs text-white/70">
                      <div>
                        <span className="text-white/40">GR No:</span>{" "}
                        <span className="font-mono font-bold text-amber-300">{student.suid}</span>
                      </div>
                      <div>
                        <span className="text-white/40">Room:</span>{" "}
                        <span className="font-bold text-white">{student.room_no || "Room 101"}</span>
                      </div>
                      <div className="col-span-2 truncate">
                        <span className="text-white/40">Academic Year / Class:</span>{" "}
                        <span className="font-bold text-white">{student.class_name || "Std 10-A (2026-27)"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Wallet Metrics Grid (4 Key Numbers) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Available Balance (Prominent Card) */}
                <Card className="col-span-2 p-4 bg-gradient-to-br from-[#4a1c14] via-[#5e2014] to-[#782414] border-2 border-amber-400/50 shadow-xl rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute top-2 right-2 p-2 rounded-xl bg-white/10">
                    <Wallet className="size-6 text-amber-300" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Available Balance
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-serif font-bold text-amber-400">₹</span>
                    <span className="text-3xl sm:text-4xl font-mono font-extrabold tracking-tight text-white">
                      {walletMetrics.availableBalance.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 mt-1 flex items-center gap-1 font-medium">
                    <ShieldCheck className="size-3.5 text-emerald-400" /> Authorized for instant cashless service
                  </p>
                </Card>

                {/* Total Credit */}
                <Card className="p-3 bg-[#25100a]/80 border border-emerald-500/30 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase">Total Credit</span>
                    <TrendingUp className="size-4 text-emerald-400" />
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-bold text-white mt-1">
                    ₹{walletMetrics.totalCredit.toFixed(2)}
                  </p>
                </Card>

                {/* Total Used / Debit */}
                <Card className="p-3 bg-[#25100a]/80 border border-rose-500/30 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 uppercase">Total Used</span>
                    <TrendingDown className="size-4 text-rose-400" />
                  </div>
                  <p className="text-lg sm:text-xl font-mono font-bold text-white mt-1">
                    ₹{walletMetrics.totalUsed.toFixed(2)}
                  </p>
                </Card>
              </div>

              {/* Recent Transaction History Ledger */}
              <Card className="flex-1 p-4 bg-[#25100a]/90 border border-amber-500/30 rounded-3xl space-y-3 flex flex-col min-h-[260px] max-h-[340px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <History className="size-4 text-amber-400" /> Recent Transactions Ledger
                  </h4>
                  <span className="text-[10px] font-mono text-white/50">
                    {walletMetrics.totalTransactions} Entries
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loadingStudentData ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/50 py-8 gap-2">
                      <Loader2 className="size-4 animate-spin text-amber-400" /> Loading wallet ledger...
                    </div>
                  ) : ledgerWithRunningBalance.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-white/50 py-8 space-y-1">
                      <Coins className="size-8 text-white/20" />
                      <p>No previous transactions found.</p>
                    </div>
                  ) : (
                    ledgerWithRunningBalance.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              tx.type === "Credit"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {tx.type === "Credit" ? (
                              <ArrowDownLeft className="size-4" />
                            ) : (
                              <ArrowUpRight className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{tx.service_name}</p>
                            <p className="text-[10px] text-white/50 font-mono">
                              {new Date(tx.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })}{" "}
                              ·{" "}
                              {new Date(tx.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`font-mono font-bold text-sm ${
                              tx.type === "Credit" ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {tx.type === "Credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                          </p>
                          {tx.balanceAfter !== undefined && (
                            <p className="text-[10px] text-white/40 font-mono">
                              Bal: ₹{tx.balanceAfter.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* RIGHT PANEL: DYNAMIC CASHLESS SERVICES (7 COLS) */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <Card className="flex-1 p-5 sm:p-6 bg-[#25100a]/90 backdrop-blur-xl border border-amber-500/30 shadow-2xl rounded-3xl flex flex-col space-y-4">
                {/* Services Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-serif font-black text-white flex items-center gap-2">
                      <Tag className="size-5 text-amber-400" /> Cashless Services (કેશલેસ સેવાઓ)
                    </h3>
                    <p className="text-xs text-white/70">
                      Tap any active service card to log transaction and deduct from student wallet.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {(config.data?.services ?? []).length} Active Services
                  </span>
                </div>

                {/* Error Banner if any */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                    <AlertCircle className="size-5 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dynamic Services Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto pr-1">
                  {(config.data?.services ?? []).map((service) => {
                    const IconComp = getServiceIcon(service.name);
                    const isAffordable =
                      service.price <= 0 || walletMetrics.availableBalance >= service.price;

                    return (
                      <button
                        key={service.id}
                        type="button"
                        disabled={busy || !isAffordable}
                        onClick={() => handleServiceClick(service)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-36 relative overflow-hidden group cursor-pointer ${
                          !isAffordable
                            ? "bg-black/30 border-white/10 opacity-50 cursor-not-allowed"
                            : "bg-gradient-to-br from-[#38150d] to-[#250d07] border-amber-500/30 hover:border-amber-400 hover:shadow-[0_10px_25px_-5px_rgba(139,37,0,0.5)] hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                      >
                        {/* Top Service Name & Icon */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                              Gurukul Service
                            </span>
                            <h4 className="text-base sm:text-lg font-serif font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                              {service.name}
                            </h4>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                            <IconComp className="size-5" />
                          </div>
                        </div>

                        {/* Bottom Price & Quick Pay Button */}
                        <div className="flex items-end justify-between pt-2 border-t border-white/10">
                          <div>
                            <span className="text-[10px] text-white/50 block">Amount</span>
                            <span className="text-lg sm:text-xl font-mono font-extrabold text-white">
                              {service.price > 0 ? `₹${service.price}` : "Variable (Keypad)"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {service.print_receipt && (
                              <span
                                title="Thermal Receipt Printed"
                                className="p-1.5 rounded-lg bg-white/5 text-white/50 text-[10px]"
                              >
                                <Printer className="size-3.5" />
                              </span>
                            )}
                            <span className="px-3 py-1.5 rounded-xl bg-[#8b2500] group-hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1">
                              Pay <ChevronRight className="size-3" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Panel Footer Security Note */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-400" />
                    Biometrically Authorized Session
                  </span>
                  <span className="font-mono text-amber-300 text-[11px]">
                    Terminal: KIOSK-01
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* CUSTOM AMOUNT NUMPAD MODAL (FOR SERVICES WITH VARIABLE PRICING) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(customService)}
        onOpenChange={(open) => {
          if (!open) setCustomService(null);
        }}
      >
        <DialogContent className="modal-luxury sm:max-w-md p-6 bg-[#25100a] text-white border-2 border-amber-500/40 rounded-3xl">
          <DialogHeader className="text-center space-y-1 pb-2 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Custom Amount Payment
            </span>
            <DialogTitle className="text-2xl font-serif font-black text-white">
              {customService?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70">
              Enter the exact amount to deduct for this service.
            </DialogDescription>
          </DialogHeader>

          {/* Amount Display */}
          <div className="my-2 p-4 rounded-2xl bg-black/40 border-2 border-amber-500/30 text-center space-y-1">
            <span className="text-xs font-semibold text-white/50">Amount to Deduct</span>
            <div className="text-4xl font-serif font-black text-white tracking-tight flex items-center justify-center gap-1">
              <span className="text-amber-400">₹</span>
              <span className="font-mono">{customAmountStr}</span>
            </div>
          </div>

          {/* Quick Add Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
            {[10, 20, 50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAddChipAmount(amt)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 hover:bg-[#8b2500] text-amber-200 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                +₹{amt}
              </button>
            ))}
          </div>

          {/* 3x4 Touch Numpad Grid */}
          <div className="grid grid-cols-3 gap-2 my-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadDigit(num)}
                className="h-12 rounded-xl text-xl font-bold font-mono bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-12 rounded-xl text-sm font-bold bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 border border-rose-500/30 text-rose-300 transition-all flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadDigit("0")}
              className="h-12 rounded-xl text-xl font-bold font-mono bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-12 rounded-xl text-sm font-bold bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center cursor-pointer"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomService(null)}
              className="w-full sm:w-auto rounded-xl border-white/20 text-white hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || Number(customAmountStr) <= 0}
              onClick={() => customService && executePunch(customService.id, Number(customAmountStr))}
              className="w-full sm:flex-1 h-12 text-sm font-bold bg-[#8b2500] hover:bg-amber-700 text-white rounded-xl shadow-lg cursor-pointer"
            >
              {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : `Confirm & Pay ₹${customAmountStr}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MANTRA MFS 100 CONNECTION ASSISTANT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={showMantraHelp} onOpenChange={setShowMantraHelp}>
        <DialogContent className="sm:max-w-xl p-6 md:p-8 bg-[#25100a] text-white border-2 border-amber-500/40 rounded-3xl shadow-2xl">
          <DialogHeader className="text-left space-y-1 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                <Usb className="size-3" /> Mantra MFS 100 Hardware Setup
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">Port 8032 / 11100</span>
            </div>
            <DialogTitle className="text-xl md:text-2xl font-serif font-black text-white flex items-center gap-2">
              <Fingerprint className="size-6 text-amber-400" /> Mantra MFS 100 Connection Guide
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70">
              મંત્રા સ્કેનર કનેક્ટ કરવા માટે નીચેના પગલાં અનુસરો (Follow steps below):
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            {/* Why notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="size-4" />
                <span>શા માટે ડિવાઇસ કનેક્ટ નથી બતાવતું? (HTTPS Browser Restriction)</span>
              </div>
              <p className="leading-relaxed text-white/80">
                વેબસાઇટ ક્લાઉડ પર <strong>HTTPS (sgrsstud.vercel.app)</strong> માં ચાલતી હોવાથી, ક્રોમ બ્રાઉઝર લોકલ <strong>USB બ્રિજ (127.0.0.1)</strong> ને મંજૂરી આપતું નથી.
              </p>
            </div>

            {/* Option 1: 1-Click launcher */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white uppercase">
                  સૌથી સરળ રસ્તો (Recommended)
                </span>
                <span className="text-[11px] font-bold text-emerald-300">1-Click Auto Launch</span>
              </div>
              <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                <Terminal className="size-4 text-emerald-400" /> Start-Kiosk-Direct-Print.bat ચલાવો
              </h4>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                પ્રોજેક્ટ ફોલ્ડરમાંથી <strong>Start-Kiosk-Direct-Print.bat</strong> પર ડબલ ક્લિક કરો. આ આપોઆપ મંત્રા બ્રિજ ચાલુ કરશે અને ક્રોમને હાર્ડવેર પરમિશન સાથે ખોલશે.
              </p>
            </div>

            {/* Option 2: Regular Chrome */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8b2500] text-white uppercase">
                નોર્મલ ક્રોમ બ્રાઉઝર માટે
              </span>
              <ol className="text-xs text-white/80 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  પ્રોજેક્ટ ફોલ્ડરમાંથી <strong>Start-Mantra-Bridge.bat</strong> ચાલુ રાખો.
                </li>
                <li>
                  ક્રોમ બ્રાઉઝરમાં ઉપર URL ની ડાબી બાજુએ <strong>Site Settings</strong> પર ક્લિક કરી <strong>Insecure content</strong> ને <strong>"Allow"</strong> કરો.
                </li>
                <li>
                  અથવા મંત્રા RD Service માટે{" "}
                  <a
                    href="https://127.0.0.1:11101/rd/info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-amber-300 underline"
                  >
                    https://127.0.0.1:11101/rd/info <ExternalLink className="size-3" />
                  </a>{" "}
                  ખોલીને <strong>"Proceed to unsafe"</strong> કરો.
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMantraHelp(false)}
              className="w-full sm:w-auto rounded-xl border-white/20 text-white"
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={testingConnection}
              onClick={testMantraConnection}
              className="w-full sm:flex-1 h-11 text-sm font-bold bg-[#8b2500] hover:bg-amber-600 text-white rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 text-amber-300 mr-2" /> Test Connection Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminal Bottom Footer */}
      <footer className="text-center text-xs font-medium text-white/50 py-1 flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>Shree Swaminarayan Gurukul, Rajkot · Cashless Biometric Terminal</span>
        <span className="hidden sm:inline">|</span>
        <span className="font-semibold text-amber-300/80">Mantra MFS 100 STQC Certified Sensor</span>
      </footer>
    </div>
  );
}
