import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Wrench,
  SlidersHorizontal,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  Monitor,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Database,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, desc: "Live overview & transactions" },
  { to: "/admin/students", label: "Students", icon: Users, desc: "Biometric enrollment & cards" },
  { to: "/admin/services", label: "Services", icon: Wrench, desc: "Pricing & receipt controls" },
  { to: "/admin/settings", label: "Limits & Messages", icon: SlidersHorizontal, desc: "Daily cap & kiosk headers" },
  { to: "/admin/reports", label: "Reports", icon: FileSpreadsheet, desc: "Excel exports & analytics" },
  { to: "/admin/staff", label: "Users & Roles", icon: ShieldCheck, desc: "Super Admin user manager" },
  { to: "/admin/maintenance", label: "Format ERP & DB", icon: Database, desc: "Database reset & wipe tools" },
] as const;

function AdminLayout() {
  const { email, roleTitle, permissions, isSuperAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const visibleNav = nav.filter((item) => {
    if (item.to === "/admin") return permissions.dashboard !== false;
    if (item.to === "/admin/students") return permissions.students;
    if (item.to === "/admin/services") return permissions.services;
    if (item.to === "/admin/settings") return permissions.settings;
    if (item.to === "/admin/reports") return permissions.reports;
    if (item.to === "/admin/staff") return permissions.users || isSuperAdmin;
    if (item.to === "/admin/maintenance") return isSuperAdmin || permissions.settings;
    return true;
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[#faf6ef] text-[#2c1810] font-sans antialiased">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-gradient-to-b from-[#2c1810] via-[#3a1d14] to-[#1e100b] p-6 text-white shadow-2xl relative border-r border-white/10 select-none">
        {/* Brand Header */}
        <div className="space-y-1 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Shree Swaminarayan Gurukul Rajkot"
              className="size-12 rounded-2xl object-contain bg-white p-1 shadow-lg border border-amber-400/40"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">
                Gurukul ERP
              </p>
              <h2 className="text-base font-serif font-extrabold tracking-tight text-white leading-tight">
                Admin Console
              </h2>
              <p className="text-[9px] text-white/50 font-sans tracking-wide">by EverStep Tech</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item }}
              className="group flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
              activeProps={{
                className:
                  "flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#8b2500] to-amber-700 text-white font-bold shadow-lg shadow-[#8b2500]/30 border border-amber-400/30",
              }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-4.5 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="size-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </nav>

        {/* User Info & Actions */}
        <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/50">Logged in user:</span>
              <span className="text-[10px] font-bold text-amber-300 font-mono">{time}</span>
            </div>
            <p className="truncate text-white font-mono text-xs font-semibold">{email}</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              <Sparkles className="size-2.5" /> {roleTitle}
            </span>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-xl py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all shadow-sm"
          >
            <Monitor className="size-3.5 text-amber-300" /> Open Kiosk Terminal
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white/80 hover:text-white hover:bg-rose-500/20 text-xs font-semibold rounded-xl"
            onClick={signOut}
          >
            <LogOut className="size-3.5 mr-2 text-rose-400" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[#2c1810] text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Logo"
            className="size-8 rounded-lg object-contain bg-white p-0.5"
          />
          <div>
            <span className="font-serif font-bold text-sm block leading-tight">Gurukul Admin</span>
            <span className="text-[9px] text-amber-300/80 font-sans block">by EverStep Tech</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-[#2c1810]/95 backdrop-blur-xl p-6 pt-20 flex flex-col justify-between text-white animate-in fade-in duration-200">
          <nav className="flex flex-col gap-2">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl text-base font-semibold text-white/80 hover:bg-white/10"
                activeProps={{
                  className: "flex items-center gap-3 p-3.5 rounded-2xl text-base font-bold bg-[#8b2500] text-white",
                }}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-3 pt-6 border-t border-white/10">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 text-white font-bold text-sm"
            >
              <Monitor className="size-4" /> Open Kiosk Terminal
            </Link>
            <Button variant="destructive" className="w-full rounded-2xl" onClick={signOut}>
              <LogOut className="size-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-x-auto p-6 md:p-10 pt-20 lg:pt-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Outlet />
      </main>
    </div>
  );
}
