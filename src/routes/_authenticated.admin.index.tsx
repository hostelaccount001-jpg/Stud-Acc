import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Receipt,
  Users,
  Ban,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Clock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard & Analytics — Gurukul Kiosk ERP" },
      { name: "description", content: "Real-time analytics, transactions, revenue and student metrics at a glance." },
    ],
  }),
  component: Dashboard,
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [tx, students, blocked] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount, service_name, student_name, suid, created_at, receipt_no")
          .gte("created_at", startOfToday())
          .order("created_at", { ascending: false }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("blocked", true),
      ]);
      const rows = tx.data ?? [];
      const byService = new Map<string, { count: number; total: number }>();
      for (const r of rows) {
        const cur = byService.get(r.service_name) ?? { count: 0, total: 0 };
        byService.set(r.service_name, { count: cur.count + 1, total: cur.total + Number(r.amount) });
      }
      return {
        rows,
        total: rows.reduce((s, r) => s + Number(r.amount), 0),
        count: rows.length,
        students: students.count ?? 0,
        blocked: blocked.count ?? 0,
        byService: [...byService.entries()],
      };
    },
    refetchInterval: 15000,
  });

  const stats = [
    {
      label: "Today's Total Spend",
      value: `₹${(data?.total ?? 0).toLocaleString("en-IN")}`,
      subtitle: `${data?.count ?? 0} cashless transactions today`,
      icon: IndianRupee,
      gradient: "from-amber-500 to-rose-600",
      textGrad: "text-[#8b2500]",
    },
    {
      label: "Receipts Generated",
      value: String(data?.count ?? 0),
      subtitle: "Thermal printed slips",
      icon: Receipt,
      gradient: "from-blue-500 to-indigo-600",
      textGrad: "text-blue-700",
    },
    {
      label: "Registered Students",
      value: String(data?.students ?? 0),
      subtitle: "Enrolled in smart database",
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
      textGrad: "text-emerald-700",
    },
    {
      label: "Blocked Cards",
      value: String(data?.blocked ?? 0),
      subtitle: (data?.blocked ?? 0) === 0 ? "All cards active" : "Temporarily suspended",
      icon: Ban,
      gradient: "from-rose-500 to-red-600",
      textGrad: "text-rose-700",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight">
              Executive Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" /> Live
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-[#7c533f]">
            Real-time analytics and cashless operations for {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/students">
            <Button size="sm" variant="outline" className="rounded-xl border-[#d8c5af] text-[#6b4a3a]">
              <UserCheck className="size-4 mr-1.5" /> Enrol Student
            </Button>
          </Link>
          <Link to="/admin/reports">
            <Button size="sm" className="rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] text-white shadow-md">
              <TrendingUp className="size-4 mr-1.5" /> Full Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 KPI METRIC CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="p-6 bg-white/90 backdrop-blur-md border-2 border-[#e5d8c5] hover:border-[#8b2500]/40 shadow-xl rounded-3xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#7c533f] uppercase tracking-wider">{s.label}</p>
              <div className={`size-10 rounded-2xl bg-gradient-to-tr ${s.gradient} flex items-center justify-center text-white shadow-md`}>
                <s.icon className="size-5" />
              </div>
            </div>
            <div className={`mt-4 text-3xl md:text-4xl font-serif font-extrabold ${s.textGrad}`}>
              {s.value}
            </div>
            <p className="mt-1 text-xs text-[#8f6853] font-medium">{s.subtitle}</p>
          </Card>
        ))}
      </div>

      {/* MAIN TWO COLUMNS */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Service Revenue Distribution */}
        <Card className="p-6 bg-white/90 backdrop-blur-md border border-[#e5d8c5] shadow-xl rounded-3xl lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between border-b border-[#e5d8c5] pb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2">
                <ShoppingBag className="size-5 text-[#8b2500]" /> Today by Service
              </h2>
              <p className="text-xs text-[#7c533f]">Breakdown of store and campus services</p>
            </div>
          </div>

          <div className="space-y-4">
            {(data?.byService ?? []).map(([name, v]) => {
              const pct = (data?.total ?? 0) > 0 ? Math.round((v.total / (data?.total ?? 1)) * 100) : 0;
              return (
                <div key={name} className="p-4 rounded-2xl bg-[#faf6ef] border border-[#e5d8c5] space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-[#4a1c14]">{name}</span>
                    <span className="font-mono font-extrabold text-[#8b2500]">₹{v.total.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#7c533f]">
                    <span>{v.count} slips issued</span>
                    <span>{pct}% share</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-[#ebdcc8] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8b2500] to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {(data?.byService ?? []).length === 0 && (
              <div className="py-12 text-center text-[#7c533f] text-sm">
                <Clock className="size-8 mx-auto text-[#c5a880] mb-2 animate-pulse" />
                No transactions recorded yet today.
              </div>
            )}
          </div>
        </Card>

        {/* Live Transaction Stream */}
        <Card className="p-6 bg-white/90 backdrop-blur-md border border-[#e5d8c5] shadow-xl rounded-3xl lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[#e5d8c5] pb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2">
                <Activity className="size-5 text-emerald-600" /> Recent Live Transactions
              </h2>
              <p className="text-xs text-[#7c533f]">Latest cashless entries processed at terminal</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-bold text-[#8b2500] hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-2.5 overflow-hidden">
            {(data?.rows ?? []).slice(0, 8).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#faf6ef] hover:bg-[#f5ecdf] border border-[#e5d8c5] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                    {r.student_name?.[0]?.toUpperCase() ?? "S"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#4a1c14] text-sm">{r.student_name}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#d8c5af] text-[#7c533f]">
                        #{String(r.receipt_no ?? "").padStart(4, "0")}
                      </span>
                    </div>
                    <p className="text-xs text-[#7c533f] font-mono mt-0.5">
                      SUID: <span className="font-semibold text-[#4a1c14]">{r.suid}</span> • {r.service_name}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-base font-extrabold text-[#8b2500] font-mono">
                    ₹{Number(r.amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#7c533f] font-mono">
                    {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </p>
                </div>
              </div>
            ))}

            {(data?.rows ?? []).length === 0 && (
              <div className="py-12 text-center text-[#7c533f] text-sm">
                <Receipt className="size-8 mx-auto text-[#c5a880] mb-2 animate-pulse" />
                No transactions completed yet today.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
