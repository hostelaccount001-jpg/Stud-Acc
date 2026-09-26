import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Monitor,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Server,
  Fingerprint,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Security Portal — Gurukul Kiosk ERP" },
      {
        name: "description",
        content: "Secure staff and administrator sign in to Gurukul Kiosk ERP.",
      },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState("CapsLock"));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Identity verified. Welcome to Gurukul Admin Portal!");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Authentication failed. Invalid email or password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0705] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Dynamic Security Aura Background Effects */}
      <div className="absolute -top-40 -left-40 size-[32rem] rounded-full bg-gradient-to-br from-amber-600/15 via-[#8b2500]/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-[32rem] rounded-full bg-gradient-to-tl from-amber-500/15 via-rose-950/20 to-transparent blur-3xl pointer-events-none" />

      {/* Subtle Security Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#f59e0b 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="w-full max-w-lg relative z-10 space-y-4">
        {/* Top Live Security Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-zinc-900/80 border border-amber-500/20 backdrop-blur-md text-[11px] text-zinc-400 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="font-semibold tracking-wider text-emerald-400 uppercase">
              Security Shield Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-300/80">
            <ShieldCheck className="size-3 text-amber-400" />
            <span>256-BIT TLS ENCRYPTED</span>
          </div>
        </div>

        {/* Main Glassmorphic Security Card */}
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950/95 to-[#150a06]/95 backdrop-blur-2xl border border-amber-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] rounded-3xl p-6 sm:p-9 space-y-6 relative overflow-hidden">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />

          {/* Emblem & Branding Section */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="size-20 mx-auto rounded-2xl bg-gradient-to-b from-amber-400/20 to-transparent p-1 shadow-[0_0_25px_rgba(217,119,6,0.3)] ring-1 ring-amber-400/40">
                <img
                  src="/logo.png"
                  alt="Shree Swaminarayan Gurukul Rajkot"
                  className="size-full rounded-xl object-contain bg-white p-1.5 shadow-md"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 rounded-full p-1 shadow-md">
                <ShieldCheck className="size-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400/90">
                Shree Swaminarayan Gurukul, Rajkot
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-white">
                Admin Security Portal
              </h1>
              <p className="text-xs text-zinc-400 font-medium max-w-sm mx-auto">
                Authorized administrative terminal for student wallets, biometric logs, and
                financial records.
              </p>
            </div>
          </div>

          {/* Sign In Form */}
          <form className="space-y-4" onSubmit={submit}>
            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-300">
                  Administrator Email
                </Label>
                <span className="text-[10px] font-mono text-zinc-500">SSG-AUTH-V2</span>
              </div>
              <div className="relative">
                <Mail className="size-4 absolute left-3.5 top-3.5 text-zinc-400 transition-colors pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@gurukul.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="secure-input h-11 pl-10 pr-3.5 bg-zinc-950/80 border-zinc-800 hover:border-amber-500/50 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 text-white placeholder:text-zinc-600 rounded-xl transition-all shadow-inner text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                  Master Password
                </Label>
                <span className="text-[10px] text-zinc-500">Encrypted</span>
              </div>
              <div className="relative">
                <Lock className="size-4 absolute left-3.5 top-3.5 text-zinc-400 transition-colors pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyActivity}
                  onKeyDown={handleKeyActivity}
                  className="secure-input h-11 pl-10 pr-10 bg-zinc-950/80 border-zinc-800 hover:border-amber-500/50 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 text-white placeholder:text-zinc-600 rounded-xl transition-all shadow-inner text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* CapsLock Alert */}
              {capsLockActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg animate-fade-in mt-1">
                  <AlertCircle className="size-3.5 flex-shrink-0" />
                  <span>Warning: Caps Lock is currently turned ON</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#8b2500] via-amber-700 to-[#a32c00] hover:from-[#a32c00] hover:via-amber-600 hover:to-[#b83300] text-white rounded-xl shadow-[0_4px_20px_rgba(139,37,0,0.4)] transition-all active:scale-[0.98] border border-amber-500/30 cursor-pointer mt-2 group"
            >
              {busy ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-amber-200" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 text-amber-300" />
                </div>
              )}
            </Button>
          </form>

          {/* Security Features Row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
              <Fingerprint className="size-4 text-amber-400" />
              <span className="text-[10px] font-semibold text-zinc-300">Mantra MFS100</span>
              <span className="text-[9px] text-zinc-500">STQC Biometric</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
              <KeyRound className="size-4 text-emerald-400" />
              <span className="text-[10px] font-semibold text-zinc-300">Role-Based</span>
              <span className="text-[9px] text-zinc-500">Privileged Guard</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1">
              <Server className="size-4 text-amber-400" />
              <span className="text-[10px] font-semibold text-zinc-300">Audit Logged</span>
              <span className="text-[9px] text-zinc-500">IP & Timestamp</span>
            </div>
          </div>

          {/* Quick Kiosk Link */}
          <div className="pt-2 text-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-amber-300 bg-zinc-950/50 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
            >
              <Monitor className="size-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              <span>Return to Cashless Kiosk Screen</span>
            </Link>
          </div>
        </div>

        {/* Security Compliance Footer */}
        <div className="text-center space-y-1 text-[11px] text-zinc-500">
          <p>Shree Swaminarayan Gurukul Rajkot · Cashless ERP Engine</p>
          <p className="text-[10px] text-zinc-600">
            Unauthorized access or tampering is strictly prohibited under institutional
            cybersecurity policies.
          </p>
        </div>
      </div>
    </main>
  );
}
