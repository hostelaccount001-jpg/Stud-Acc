import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Monitor, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Portal Sign In — Gurukul Kiosk ERP" },
      { name: "description", content: "Secure staff and administrator sign in to Gurukul Kiosk ERP." },
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Welcome back to Gurukul Admin Portal!");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials. Please check your email/password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e0f09] via-[#33140c] to-[#140a06] text-white flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Decorative Auras */}
      <div className="absolute top-10 left-10 size-80 sm:size-96 rounded-full bg-[#8b2500]/25 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 size-80 sm:size-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md p-6 sm:p-8 md:p-10 bg-[#25100a]/90 backdrop-blur-2xl border border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-3xl text-white space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Emblem & Branding */}
        <div className="text-center space-y-3">
          <div className="relative inline-block mx-auto">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-[#8b2500] opacity-50 blur-sm" />
            <img
              src="/logo.png"
              alt="Shree Swaminarayan Gurukul Rajkot"
              className="relative size-20 rounded-2xl object-contain bg-white p-1.5 shadow-2xl border-2 border-amber-400/60 mx-auto"
            />
          </div>
          
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300 drop-shadow-xs">
              Shree Swaminarayan Gurukul, Rajkot
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-white mt-1">
              Admin Portal
            </h1>
            <p className="text-xs text-amber-100/70 mt-1">
              Secure Central Management Console
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-amber-200 tracking-wide">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="size-4.5 absolute left-3.5 top-3.5 text-amber-400 pointer-events-none z-10" />
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@gurukul.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10.5 pr-4 bg-black/40 border-white/20 text-white placeholder:text-white/35 rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-bold text-amber-200 tracking-wide">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="size-4.5 absolute left-3.5 top-3.5 text-amber-400 pointer-events-none z-10" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10.5 pr-11 bg-black/40 border-white/20 text-white placeholder:text-white/35 rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all font-medium text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-white/50 hover:text-amber-300 transition-colors p-0.5 rounded-md"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#8b2500] via-[#a32c00] to-amber-700 hover:from-[#a32c00] hover:to-amber-600 text-white rounded-xl shadow-xl shadow-[#8b2500]/40 transition-all active:scale-[0.98] mt-2 cursor-pointer border border-amber-400/30"
          >
            {busy ? (
              <>
                <Loader2 className="size-4.5 animate-spin mr-2" /> Authenticating...
              </>
            ) : (
              <>
                Sign In to Admin Portal <ArrowRight className="size-4.5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Quick Kiosk Link */}
        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors py-1 px-3 rounded-lg hover:bg-white/5"
          >
            <Monitor className="size-3.5" /> Return to Cashless Kiosk Screen
          </Link>
        </div>
      </Card>
    </main>
  );
}

