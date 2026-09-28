import React, { useReducer, useEffect, useRef, useCallback, useMemo, useState } from "react";
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
  Wallet,
} from "lucide-react";
import { captureFinger, identify, useMantraDevice } from "@/lib/mantra";
import {
  getKioskConfig,
  punchService,
  getStudentGallery,
  getStudentKioskData,
  type StudentKioskData,
} from "@/lib/kiosk.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";
import { GurukulLoader } from "@/components/GurukulLoader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Gurukul Kiosk — Direct Mantra MFS100 Fingerprint Biometric System",
      },
      {
        name: "description",
        content:
          "Self-service cashless payment terminal with direct Mantra MFS100 fingerprint biometric authentication.",
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

type KioskState = {
  step: Step;
  scannerStatus: "idle" | "scanning" | "matching" | "loading";
  capturedScan: CapturedScan | null;
  student: VerifiedStudent | null;
  walletData: StudentKioskData | null;
  error: string;
  successBanner: string | null;
  punchingService: string | null;
};

type KioskAction =
  | { type: "START_SCAN" }
  | { type: "START_MATCHING"; capture: CapturedScan }
  | { type: "START_LOADING" }
  | { type: "VERIFIED_SUCCESS"; student: VerifiedStudent; walletData: StudentKioskData }
  | { type: "SCAN_MISMATCH"; error: string }
  | { type: "SCAN_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_SUCCESS_BANNER"; banner: string | null }
  | { type: "START_PUNCH"; serviceName: string }
  | { type: "PUNCH_COMPLETE"; error?: string }
  | { type: "RESET" };

const initialKioskState: KioskState = {
  step: "scan",
  scannerStatus: "idle",
  capturedScan: null,
  student: null,
  walletData: null,
  error: "",
  successBanner: null,
  punchingService: null,
};

function kioskReducer(state: KioskState, action: KioskAction): KioskState {
  switch (action.type) {
    case "START_SCAN":
      if (state.scannerStatus === "scanning" && state.step === "scan") return state;
      return { ...state, scannerStatus: "scanning" };

    case "START_MATCHING":
      return { ...state, scannerStatus: "matching", capturedScan: action.capture };

    case "START_LOADING":
      return { ...state, scannerStatus: "loading" };

    case "VERIFIED_SUCCESS":
      return {
        ...state,
        step: "service",
        scannerStatus: "idle",
        student: action.student,
        walletData: action.walletData,
        error: "",
        successBanner: `Biometric Verified: Welcome, ${action.student.name}!`,
      };

    case "SCAN_MISMATCH":
    case "SCAN_ERROR":
      return {
        ...state,
        scannerStatus: "idle",
        error: action.error,
      };

    case "CLEAR_ERROR":
      if (!state.error) return state;
      return { ...state, error: "" };

    case "SET_SUCCESS_BANNER":
      if (state.successBanner === action.banner) return state;
      return { ...state, successBanner: action.banner };

    case "START_PUNCH":
      return { ...state, punchingService: action.serviceName, error: "" };

    case "PUNCH_COMPLETE":
      return { ...state, punchingService: null, error: action.error || "" };

    case "RESET":
      return {
        step: "scan",
        scannerStatus: "idle",
        capturedScan: null,
        student: null,
        walletData: null,
        error: "",
        successBanner: null,
        punchingService: null,
      };

    default:
      return state;
  }
}

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

// React.memo memoized service card component to prevent UI lag on re-renders
const ServiceCard = React.memo(function ServiceCard({
  service,
  disabled,
  onClick,
}: {
  service: ServiceItem;
  disabled: boolean;
  onClick: (service: ServiceItem) => void;
}) {
  const meta = getServiceMeta(service.name);
  const IconComp = meta.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(service)}
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
});

function Kiosk() {
  const [state, dispatch] = useReducer(kioskReducer, initialKioskState);
  const [autoDetect, setAutoDetect] = useState(true);

  // Background printing receipt container
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Custom Amount Numpad Modal State
  const [customService, setCustomService] = useState<ServiceItem | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string>("0");

  const getConfig = useServerFn(getKioskConfig);
  const punch = useServerFn(punchService);
  const getGallery = useServerFn(getStudentGallery);
  const getStudentData = useServerFn(getStudentKioskData);

  // Live Mantra MFS100 device status (warm connection)
  const { device, checking: deviceChecking, isConnected } = useMantraDevice(5000);

  // In-flight guard ref to prevent overlapping captures
  const inFlightRef = useRef(false);
  // Ref for session timeout resets (avoids top-level state timer re-renders)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config = useQuery({
    queryKey: ["kiosk-config"],
    queryFn: () => getConfig(),
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const galleryQuery = useQuery({
    queryKey: ["kiosk-gallery"],
    queryFn: () => getGallery(),
    refetchInterval: 600000, // Loaded once, refreshed every 10 minutes
    staleTime: 600000,
  });

  const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
  const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Biometric Kiosk Terminal";
  const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";

  // Realtime Supabase synchronization for active services and student templates
  useEffect(() => {
    const channel = supabase
      .channel("kiosk-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        void config.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        void galleryQuery.refetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [config, galleryQuery]);

  // Auto-dismiss success banner without re-rendering top state
  useEffect(() => {
    if (state.successBanner) {
      const timer = setTimeout(() => dispatch({ type: "SET_SUCCESS_BANNER", banner: null }), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.successBanner]);

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    inFlightRef.current = false;
    dispatch({ type: "RESET" });
    setCustomService(null);
    setCustomAmountStr("0");
  }, []);

  // AUTO-DETECT: Zero-Touch Single Sequential Biometric Sensing Loop
  useEffect(() => {
    let cancelled = false;

    if (state.step !== "scan" || !autoDetect || !isConnected) {
      return;
    }

    const runLoop = async () => {
      while (!cancelled && state.step === "scan" && autoDetect && isConnected) {
        if (inFlightRef.current) {
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        const gallery = galleryQuery.data || [];
        if (gallery.length === 0) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        inFlightRef.current = true;
        dispatch({ type: "START_SCAN" });

        try {
          const t0 = performance.now();

          // Stage (a): Finger placed to capture returns (quality=60, timeout=10000ms)
          const tCaptureStart = performance.now();
          const capture = await captureFinger(60, 10000);
          const tCaptureEnd = performance.now();
          const captureMs = Math.round(tCaptureEnd - tCaptureStart);

          if (cancelled) break;

          if (capture.ok && capture.template) {
            dispatch({
              type: "START_MATCHING",
              capture: {
                template: capture.template,
                quality: capture.quality,
                serial: capture.serial,
                at: new Date().toISOString(),
              },
            });

            // Stage (b): Template matching against in-memory gallery
            const tMatchStart = performance.now();
            const matched = await identify(capture.template, gallery, 8);
            const tMatchEnd = performance.now();
            const matchMs = Math.round(tMatchEnd - tMatchStart);

            if (matched) {
              dispatch({ type: "START_LOADING" });

              // Stage (c): Supabase fetch student + wallet + services in ONE round trip
              const tSupabaseStart = performance.now();
              const studentKioskData = await getStudentData({ data: { studentId: matched.id } });
              const tSupabaseEnd = performance.now();
              const supabaseMs = Math.round(tSupabaseEnd - tSupabaseStart);

              const verified: VerifiedStudent = {
                id: matched.id,
                suid: matched.suid,
                name: matched.name,
                class_name: matched.class_name,
                room_no: matched.room_no,
                templates: matched.templates || [],
              };

              // Stage (d): State update to first paint
              const tRenderStart = performance.now();
              dispatch({
                type: "VERIFIED_SUCCESS",
                student: verified,
                walletData: studentKioskData,
              });

              requestAnimationFrame(() => {
                const tRenderEnd = performance.now();
                const renderMs = Math.round(tRenderEnd - tRenderStart);
                const totalMs = Math.round(tRenderEnd - t0);
                console.log(
                  `[scan] capture=${captureMs}ms match=${matchMs}ms supabase=${supabaseMs}ms render=${renderMs}ms total=${totalMs}ms`,
                );
              });

              // Set clean auto-reset after 30 seconds idle on service screen
              if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
              resetTimerRef.current = setTimeout(() => {
                dispatch({ type: "RESET" });
              }, 30000);

              break; // Student verified, cleanly exit sensing loop
            } else {
              dispatch({
                type: "SCAN_MISMATCH",
                error:
                  "❌ Fingerprint not recognized. Please place your registered finger firmly on the Mantra sensor.",
              });
              setTimeout(() => {
                if (!cancelled) dispatch({ type: "CLEAR_ERROR" });
              }, 2000);
            }
          }
        } catch (err) {
          console.error("Auto-sensing capture exception:", err);
        } finally {
          inFlightRef.current = false;
        }
      }
    };

    void runLoop();

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [state.step, autoDetect, isConnected, galleryQuery.data, getStudentData]);

  // STEP 1: Direct Fingerprint Scan (Manual Button Fallback)
  async function startFingerScan() {
    if (inFlightRef.current || state.scannerStatus !== "idle") return;
    inFlightRef.current = true;
    dispatch({ type: "START_SCAN" });

    try {
      const gallery = galleryQuery.data || [];
      if (gallery.length === 0) {
        dispatch({
          type: "SCAN_ERROR",
          error: "Student database is loading or no biometric records enrolled.",
        });
        return;
      }

      const t0 = performance.now();

      // Stage (a)
      const tCaptureStart = performance.now();
      const capture = await captureFinger(60, 10000);
      const tCaptureEnd = performance.now();
      const captureMs = Math.round(tCaptureEnd - tCaptureStart);

      if (!capture.ok) {
        dispatch({
          type: "SCAN_ERROR",
          error: capture.error || "Failed to capture fingerprint. Place finger firmly on sensor glass.",
        });
        return;
      }

      dispatch({
        type: "START_MATCHING",
        capture: {
          template: capture.template,
          quality: capture.quality,
          serial: capture.serial,
          at: new Date().toISOString(),
        },
      });

      // Stage (b)
      const tMatchStart = performance.now();
      const matched = await identify(capture.template, gallery, 8);
      const tMatchEnd = performance.now();
      const matchMs = Math.round(tMatchEnd - tMatchStart);

      if (!matched) {
        dispatch({
          type: "SCAN_MISMATCH",
          error:
            "❌ Fingerprint not recognized. Please place your registered finger firmly on the Mantra sensor.",
        });
        return;
      }

      dispatch({ type: "START_LOADING" });

      // Stage (c)
      const tSupabaseStart = performance.now();
      const studentKioskData = await getStudentData({ data: { studentId: matched.id } });
      const tSupabaseEnd = performance.now();
      const supabaseMs = Math.round(tSupabaseEnd - tSupabaseStart);

      const verified: VerifiedStudent = {
        id: matched.id,
        suid: matched.suid,
        name: matched.name,
        class_name: matched.class_name,
        room_no: matched.room_no,
        templates: matched.templates || [],
      };

      // Stage (d)
      const tRenderStart = performance.now();
      dispatch({
        type: "VERIFIED_SUCCESS",
        student: verified,
        walletData: studentKioskData,
      });

      requestAnimationFrame(() => {
        const tRenderEnd = performance.now();
        const renderMs = Math.round(tRenderEnd - tRenderStart);
        const totalMs = Math.round(tRenderEnd - t0);
        console.log(
          `[scan] capture=${captureMs}ms match=${matchMs}ms supabase=${supabaseMs}ms render=${renderMs}ms total=${totalMs}ms`,
        );
      });

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        dispatch({ type: "RESET" });
      }, 30000);
    } catch {
      dispatch({
        type: "SCAN_ERROR",
        error: "Communication error with Mantra scanner. Check USB connection and driver.",
      });
    } finally {
      inFlightRef.current = false;
    }
  }

  // STEP 2: Service Selection & Execution
  const handleServiceClick = useCallback((service: ServiceItem) => {
    if (service.price === 0) {
      setCustomService(service);
      setCustomAmountStr("0");
    } else {
      void executePunch(service.id, service.price, service.name);
    }
  }, []);

  async function executePunch(serviceId: string, amount?: number, serviceName?: string) {
    if (!state.student) return;
    dispatch({ type: "START_PUNCH", serviceName: serviceName || "Campus Service" });
    const studentName = state.student.name;

    try {
      const res = await punch({
        data: {
          studentId: state.student.id,
          suid: state.student.suid,
          serviceId,
          customAmount: amount && amount > 0 ? amount : undefined,
        },
      });

      if (res.status === "ok") {
        dispatch({
          type: "SET_SUCCESS_BANNER",
          banner: `✅ ${res.message} for ${studentName}`,
        });

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
          }, 200);
        }

        // Auto-reset back to scan screen after transaction
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          reset();
        }, 3500);

        dispatch({ type: "PUNCH_COMPLETE" });
      } else if (res.status === "blocked") {
        dispatch({ type: "PUNCH_COMPLETE", error: `❌ Student Account Blocked: ${res.message}` });
      } else if (res.status === "limit") {
        dispatch({ type: "PUNCH_COMPLETE", error: `⚠️ Daily Limit Exceeded: ${res.message}` });
      } else {
        dispatch({ type: "PUNCH_COMPLETE", error: "❌ Transaction failed. Please try again." });
      }
    } catch {
      dispatch({ type: "PUNCH_COMPLETE", error: "Transaction error. Please try again." });
    }
  }

  // Touch Keypad Handlers
  const handleKeypadDigit = useCallback((digit: string) => {
    setCustomAmountStr((prev) => (prev === "0" ? digit : prev + digit));
  }, []);

  const handleKeypadBackspace = useCallback(() => {
    setCustomAmountStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  }, []);

  const handleKeypadClear = useCallback(() => {
    setCustomAmountStr("0");
  }, []);

  const handleAddChipAmount = useCallback((add: number) => {
    setCustomAmountStr((prev) => {
      const current = Number(prev) || 0;
      return String(Math.min(10000, current + add));
    });
  }, []);

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
          <ReceiptSlip title={title} receipt={activeReceipt} footerText={footerText} />
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
            <Sparkles
              className="size-3.5 text-amber-600 animate-spin"
              style={{ animationDuration: "6s" }}
            />
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
              state.step === "scan"
                ? "bg-[#4a1c14] text-white shadow-lg scale-105 ring-2 ring-amber-500/40"
                : "bg-emerald-600/20 text-emerald-900 border border-emerald-500/40"
            }`}
          >
            {state.student ? (
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            ) : (
              <Fingerprint className="size-3.5" />
            )}
            1. Scan Fingerprint (MFS100)
          </span>
          <span className="text-[#c5a880] font-bold">———</span>
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              state.step === "service"
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
      {state.successBanner && (
        <div className="max-w-xl mx-auto w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-2xl flex items-center justify-center gap-3 text-center text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-4 duration-300 z-30">
          <CheckCircle2 className="size-6 shrink-0 text-emerald-200" />
          <span>{state.successBanner}</span>
        </div>
      )}

      {/* Main Terminal Stage */}
      <main className="flex-1 flex items-center justify-center my-4 relative z-10">
        {/* STEP 1: Direct Fingerprint Scan on Mantra MFS100 */}
        {state.step === "scan" && (
          <Card className="w-full max-w-xl p-8 md:p-12 text-center bg-white/95 backdrop-blur-md border-2 border-[#e5d8c5] shadow-[0_20px_60px_-15px_rgba(74,28,20,0.15)] rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Device Connectivity & Auto-Sense Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 min-h-[32px]">
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
                    isConnected
                      ? "bg-emerald-500 animate-pulse"
                      : deviceChecking
                        ? "bg-amber-500"
                        : "bg-rose-500"
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
                  {state.scannerStatus === "scanning"
                    ? "CAPTURE IN PROGRESS"
                    : state.scannerStatus === "matching"
                      ? "BIOMETRIC MATCHING"
                      : "OPTICAL ARMED"}
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
                    state.scannerStatus === "scanning"
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
                      state.scannerStatus === "scanning"
                        ? "text-rose-600 scale-110 animate-pulse drop-shadow-[0_0_15px_rgba(225,29,72,0.6)]"
                        : "text-[#8b2500] animate-holographic-breathe group-hover:scale-105"
                    }`}
                  />
                </div>
              </div>

              {/* Real-time Telemetry & Frequency Visualizer Bars - Stable fixed height */}
              <div className="mt-3 h-7 flex items-center gap-1.5 px-3 rounded-full bg-[#f4ebe0]/80 border border-[#b87333]/30 shadow-xs select-none">
                <span className="text-[10px] font-mono font-bold text-[#8b2500] uppercase tracking-wider mr-1">
                  FREQ
                </span>
                <div className="flex items-center gap-1 h-3.5">
                  {[40, 70, 100, 60, 85, 30, 95, 55, 80, 45].map((val, idx) => (
                    <span
                      key={idx}
                      className="w-1 h-3.5 rounded-full bg-gradient-to-t from-[#8b2500] to-amber-500 origin-bottom"
                      style={{
                        animation: `live-eq-bar ${0.6 + (idx % 4) * 0.25}s ease-in-out infinite alternate`,
                        animationDelay: `${idx * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 ml-1">
                  MANTRA ACTIVE
                </span>
              </div>
            </div>

            {/* Stable Non-Jittering Heading & Instruction Text Block */}
            <div className="space-y-1.5 min-h-[76px] flex flex-col justify-center select-none">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#4a1c14] leading-tight">
                {state.scannerStatus === "scanning"
                  ? "Place Finger on Scanner Glass"
                  : state.scannerStatus === "matching"
                    ? "Verifying Fingerprint..."
                    : "Place Finger to Authenticate"}
              </h2>
              <p className="text-sm md:text-base text-[#7c533f] font-medium leading-normal">
                {state.scannerStatus === "scanning"
                  ? "🟢 Optical sensor active. Place registered finger directly on Mantra glass."
                  : state.scannerStatus === "matching"
                    ? "Searching biometric enrolled records..."
                    : "Mantra optical biometric sensor is armed and ready."}
              </p>
            </div>

            {state.error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left animate-in fade-in duration-200">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button
                size="lg"
                onClick={() => void startFingerScan()}
                disabled={state.scannerStatus === "scanning" || state.scannerStatus === "matching" || inFlightRef.current}
                className="w-full h-15 text-lg font-bold text-white rounded-2xl shadow-[0_12px_28px_-6px_rgba(139,37,0,0.45)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shimmer-btn cursor-pointer bg-gradient-to-r from-[#4a1c14] via-[#6d2518] to-[#8b2500] border border-amber-500/20"
              >
                {state.scannerStatus === "scanning" ? (
                  <>
                    <Loader2 className="size-6 animate-spin mr-2" />
                    Scanning Fingerprint...
                  </>
                ) : state.scannerStatus === "matching" ? (
                  <>
                    <Loader2 className="size-6 animate-spin mr-2" />
                    Matching Fingerprint...
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
        {state.step === "service" && state.student && (
          <div className="w-full max-w-5xl space-y-4 animate-in fade-in zoom-in-95 duration-300 font-sans">
            {/* Top Verified Student Header Banner */}
            <div className="bg-gradient-to-r from-[#4a1c14] via-[#5c2016] to-[#3a140d] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 select-none">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight uppercase text-white">
                  {state.student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold tracking-wider text-amber-200/90 font-mono uppercase">
                  <span>
                    UNIQUE/HR NO.: <span className="font-bold text-white">{state.student.suid}</span>
                  </span>
                  {state.student.class_name && (
                    <span>
                      • CLASS: <span className="font-bold text-white">{state.student.class_name}</span>
                    </span>
                  )}
                  {state.student.room_no && (
                    <span>
                      • ROOM: <span className="font-bold text-white">{state.student.room_no}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {state.walletData?.dailyLimit && (
                  <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-right">
                    <span className="text-[10px] uppercase tracking-wider text-amber-200 font-mono">Daily Limit</span>
                    <span className="text-sm font-bold text-white font-mono">
                      ₹{state.walletData.dailyLimit} (₹{state.walletData.spentToday} used)
                    </span>
                  </div>
                )}
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

            {state.error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0 text-rose-600" />
                <span>{state.error}</span>
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
                {(config.data?.services ?? []).map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    disabled={state.punchingService !== null}
                    onClick={handleServiceClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Gurukul Logo Loading Circle Overlay during Service Selection & Payment */}
      {(state.punchingService !== null || state.scannerStatus === "loading") && state.step === "service" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-[#fefcf9] p-8 md:p-10 rounded-3xl border-2 border-amber-500/40 shadow-[0_25px_60px_-15px_rgba(74,28,20,0.3)] max-w-sm w-full mx-auto text-center space-y-2">
            <GurukulLoader
              size="md"
              text={state.punchingService ? `Processing ${state.punchingService}...` : "Loading Student Data..."}
              subtext="Generating thermal receipt & recording cashless entry..."
            />
          </div>
        </div>
      )}

      {/* Custom Amount Numpad Dialog */}
      <Dialog
        open={Boolean(customService)}
        onOpenChange={(open) => !open && setCustomService(null)}
      >
        <DialogContent className="max-w-sm p-6 bg-[#fdfbf7] border-2 border-[#e5d8c5] rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-sans text-xl font-extrabold text-[#2d140d] tracking-tight">
              {customService?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Amount Display */}
          <div className="my-3 rounded-2xl bg-white border-2 border-[#d8c5af] p-4 text-center shadow-xs">
            <span className="text-xs font-bold text-[#7c533f] uppercase tracking-wider block">
              Total Amount
            </span>
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
              disabled={state.punchingService !== null || Number(customAmountStr) <= 0}
              onClick={() =>
                customService &&
                executePunch(customService.id, Number(customAmountStr), customService.name)
              }
              className="w-full sm:flex-1 h-12 text-base font-bold bg-[#4a1c14] hover:bg-[#8b2500] text-white rounded-xl shadow-lg cursor-pointer"
            >
              {state.punchingService !== null ? (
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
          <ReceiptSlip title={title} receipt={activeReceipt} footerText={footerText} />
        </div>
      )}
    </div>
  );
}
