import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Monitor, Loader2, KeyRound } from "lucide-react";

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
    <main className="min-h-screen bg-gradient-to-br from-[#2c1810] via-[#4a1c14] to-[#1a0f0a] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Aura */}
      <div className="absolute top-1/4 -left-32 size-96 rounded-full bg-[#8b2500]/30 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 size-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md p-8 md:p-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl text-white space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Emblem & Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto size-16 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 flex items-center justify-center shadow-lg border border-amber-400/30">
            <ShieldCheck className="size-9 text-white" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">
            Shree Swaminarayan Gurukul
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight text-white">
            Admin Portal
          </h1>
          <p className="text-xs text-white/70">
            Secure administrative access for kiosk & student accounts
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-white/90">
              Staff Email Address
            </Label>
            <div className="relative">
              <Mail className="size-4 absolute left-3.5 top-3.5 text-white/40" />
              <Input
                id="email"
                type="email"
                required
                placeholder="anshsangani2007@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10 bg-black/20 border-white/15 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-white/90">
              Password
            </Label>
            <div className="relative">
              <Lock className="size-4 absolute left-3.5 top-3.5 text-white/40" />
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10 bg-black/20 border-white/15 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#8b2500] to-amber-700 hover:from-[#a32c00] hover:to-amber-600 text-white rounded-xl shadow-xl transition-all active:scale-98 mt-2"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Authenticating...
              </>
            ) : (
              <>
                Sign In to Admin Portal <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Quick Kiosk Link */}
        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300/80 hover:text-amber-300 transition-colors"
          >
            <Monitor className="size-3.5" /> Return to Cashless Kiosk Screen
          </Link>
        </div>
      </Card>
    </main>
  );
}
