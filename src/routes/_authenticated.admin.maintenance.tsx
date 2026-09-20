import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Wrench,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Database,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Users,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  FileSpreadsheet,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { executeErpFormatServer } from "@/lib/maintenance.functions";

export const Route = createFileRoute("/_authenticated/admin/maintenance")({
  head: () => ({
    meta: [
      { title: "Format ERP & Database — Gurukul Kiosk ERP" },
      { name: "description", content: "Selectively format or reset specific ERP modules: Students, Services, Limits, Reports, or Users." },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const qc = useQueryClient();
  const executeFormatFn = useServerFn(executeErpFormatServer);

  // Checkbox selections matching exactly the 5 ERP Modules in Sidebar:
  // 1. Students
  // 2. Services
  // 3. Limits & Messages
  // 4. Reports
  // 5. Users & Roles
  const [formatStudents, setFormatStudents] = useState(false);
  const [formatServices, setFormatServices] = useState(false);
  const [formatSettings, setFormatSettings] = useState(false);
  const [formatReports, setFormatReports] = useState(true);
  const [formatStaffUsers, setFormatStaffUsers] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isFullReset, setIsFullReset] = useState(false);

  // Fetch Live Module Statistics
  const dbStats = useQuery({
    queryKey: ["db-stats-modules"],
    queryFn: async () => {
      const [tx, students, services, settings, profiles] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("settings").select("key", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        transactions: tx.count ?? 0,
        students: students.count ?? 0,
        services: services.count ?? 0,
        settings: settings.count ?? 0,
        users: profiles.count ?? 1,
      };
    },
  });

  const formatMutation = useMutation({
    mutationFn: async (opts: {
      formatStudents: boolean;
      formatServices: boolean;
      formatSettings: boolean;
      formatReports: boolean;
      formatStaffUsers: boolean;
    }) => {
      const res = await executeFormatFn({ data: opts });
      return res;
    },
    onSuccess: (res) => {
      toast.success("Selected ERP Modules Formatted Successfully!");
      setConfirmModalOpen(false);
      qc.invalidateQueries();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to format ERP modules");
    },
  });

  function selectAllModules() {
    setFormatStudents(true);
    setFormatServices(true);
    setFormatSettings(true);
    setFormatReports(true);
    setFormatStaffUsers(true);
  }

  function deselectAllModules() {
    setFormatStudents(false);
    setFormatServices(false);
    setFormatSettings(false);
    setFormatReports(false);
    setFormatStaffUsers(false);
  }

  function triggerSelectedFormat() {
    if (!formatStudents && !formatServices && !formatSettings && !formatReports && !formatStaffUsers) {
      toast.error("Please select at least one module to format");
      return;
    }
    setIsFullReset(false);
    setConfirmModalOpen(true);
  }

  function triggerFullReset() {
    setFormatStudents(true);
    setFormatServices(true);
    setFormatSettings(true);
    setFormatReports(true);
    setFormatStaffUsers(true);
    setIsFullReset(true);
    setConfirmModalOpen(true);
  }

  function handleConfirmExecute() {
    formatMutation.mutate({
      formatStudents,
      formatServices,
      formatSettings,
      formatReports,
      formatStaffUsers,
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <Database className="size-8 text-[#8b2500]" /> ERP Module Format & Reset Console
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Selectively format any individual module from the ERP sidebar, or execute a complete clean factory reset.
          </p>
        </div>

        <button
          type="button"
          onClick={triggerFullReset}
          className="btn-luxury-danger px-6 py-2.5 text-xs gap-2 shadow-lg"
        >
          <ShieldAlert className="size-4" /> Full ERP Factory Format (Wipe All 5 Modules)
        </button>
      </header>

      {/* 5 Module Live Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className="card-luxury p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7c533f] uppercase">Students</span>
            <Users className="size-4 text-blue-700" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-blue-800">
            {dbStats.data?.students ?? 0}
          </div>
          <p className="text-[10px] text-[#7c533f]">Enrolled records</p>
        </Card>

        <Card className="card-luxury p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7c533f] uppercase">Services</span>
            <ShoppingBag className="size-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-emerald-800">
            {dbStats.data?.services ?? 0}
          </div>
          <p className="text-[10px] text-[#7c533f]">Active pricing</p>
        </Card>

        <Card className="card-luxury p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7c533f] uppercase">Limits & Msgs</span>
            <SlidersHorizontal className="size-4 text-purple-700" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-purple-800">
            {dbStats.data?.settings ?? 0}
          </div>
          <p className="text-[10px] text-[#7c533f]">Config keys</p>
        </Card>

        <Card className="card-luxury p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7c533f] uppercase">Reports (Ledger)</span>
            <FileSpreadsheet className="size-4 text-[#8b2500]" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-[#4a1c14]">
            {dbStats.data?.transactions ?? 0}
          </div>
          <p className="text-[10px] text-[#7c533f]">Purchase slips</p>
        </Card>

        <Card className="card-luxury p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#7c533f] uppercase">Users & Roles</span>
            <ShieldCheck className="size-4 text-amber-700" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-amber-800">
            {dbStats.data?.users ?? 1}
          </div>
          <p className="text-[10px] text-[#7c533f]">Staff accounts</p>
        </Card>
      </div>

      {/* 5 ERP Sidebar Module Format Selection */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#4a1c14] flex items-center gap-2">
              <Trash2 className="size-5 text-[#8b2500]" /> Select ERP Modules to Format
            </h2>
            <p className="text-xs text-[#7c533f]">
              Choose which module you want to wipe or reset. Only the checked modules will be formatted.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllModules}
              className="btn-luxury-secondary px-3.5 py-1.5 text-xs gap-1.5"
            >
              <CheckSquare className="size-3.5 text-[#8b2500]" /> Select All
            </button>
            <button
              type="button"
              onClick={deselectAllModules}
              className="btn-luxury-secondary px-3.5 py-1.5 text-xs gap-1.5"
            >
              <Square className="size-3.5" /> Deselect All
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Module 1: Students */}
          <div
            onClick={() => setFormatStudents(!formatStudents)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              formatStudents
                ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm"
                : "bg-white border-[#e5d8c5] text-[#7c533f]"
            }`}
          >
            <Checkbox
              checked={formatStudents}
              onCheckedChange={(c) => setFormatStudents(!!c)}
              className="mt-1"
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#4a1c14] flex items-center gap-1.5">
                  <Users className="size-4 text-blue-700" /> 1. Students Module
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]">
                  {dbStats.data?.students ?? 0} students
                </span>
              </div>
              <p className="text-xs text-[#7c533f]">
                Wipes all registered student names, SUIDs, NFC smart card mappings, and biometric fingerprints.
              </p>
            </div>
          </div>

          {/* Module 2: Services */}
          <div
            onClick={() => setFormatServices(!formatServices)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              formatServices
                ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm"
                : "bg-white border-[#e5d8c5] text-[#7c533f]"
            }`}
          >
            <Checkbox
              checked={formatServices}
              onCheckedChange={(c) => setFormatServices(!!c)}
              className="mt-1"
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#4a1c14] flex items-center gap-1.5">
                  <ShoppingBag className="size-4 text-emerald-700" /> 2. Services Module
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]">
                  {dbStats.data?.services ?? 0} services
                </span>
              </div>
              <p className="text-xs text-[#7c533f]">
                Wipes and deletes all services completely from database so you can add new custom services.
              </p>
            </div>
          </div>

          {/* Module 3: Limits & Messages */}
          <div
            onClick={() => setFormatSettings(!formatSettings)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              formatSettings
                ? "bg-amber-500/10 border-amber-500/40 text-[#4a1c14] shadow-sm"
                : "bg-white border-[#e5d8c5] text-[#7c533f]"
            }`}
          >
            <Checkbox
              checked={formatSettings}
              onCheckedChange={(c) => setFormatSettings(!!c)}
              className="mt-1"
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#4a1c14] flex items-center gap-1.5">
                  <SlidersHorizontal className="size-4 text-purple-700" /> 3. Limits & Messages Module
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]">
                  Defaults
                </span>
              </div>
              <p className="text-xs text-[#7c533f]">
                Resets student daily spending limit (₹500), kiosk headers, and thermal receipt footer message to default.
              </p>
            </div>
          </div>

          {/* Module 4: Reports (Transactions Ledger) */}
          <div
            onClick={() => setFormatReports(!formatReports)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
              formatReports
                ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm"
                : "bg-white border-[#e5d8c5] text-[#7c533f]"
            }`}
          >
            <Checkbox
              checked={formatReports}
              onCheckedChange={(c) => setFormatReports(!!c)}
              className="mt-1"
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#4a1c14] flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-[#8b2500]" /> 4. Reports Module (Ledger)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]">
                  {dbStats.data?.transactions ?? 0} rows
                </span>
              </div>
              <p className="text-xs text-[#7c533f]">
                Wipes all historical transaction slips and purchases. Resets daily and monthly revenue charts to ₹0.
              </p>
            </div>
          </div>

          {/* Module 5: Users & Roles */}
          <div
            onClick={() => setFormatStaffUsers(!formatStaffUsers)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 md:col-span-2 ${
              formatStaffUsers
                ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm"
                : "bg-white border-[#e5d8c5] text-[#7c533f]"
            }`}
          >
            <Checkbox
              checked={formatStaffUsers}
              onCheckedChange={(c) => setFormatStaffUsers(!!c)}
              className="mt-1"
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#4a1c14] flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-amber-700" /> 5. Users & Roles Module
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]">
                  {dbStats.data?.users ?? 1} users
                </span>
              </div>
              <p className="text-xs text-[#7c533f]">
                Deletes all additional staff and admin accounts. (Primary Super Admin account remains safely preserved).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#e5d8c5]">
          <div className="text-xs text-[#7c533f]">
            Selected for Format:{" "}
            <strong className="text-[#8b2500]">
              {[
                formatStudents && "1. Students",
                formatServices && "2. Services",
                formatSettings && "3. Limits & Messages",
                formatReports && "4. Reports",
                formatStaffUsers && "5. Users & Roles",
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            </strong>
          </div>

          <button
            type="button"
            onClick={triggerSelectedFormat}
            disabled={
              formatMutation.isPending ||
              (!formatStudents && !formatServices && !formatSettings && !formatReports && !formatStaffUsers)
            }
            className="btn-luxury-primary px-8 py-3 text-sm gap-2 disabled:opacity-50"
          >
            <RotateCcw className="size-4" /> Format Selected ERP Modules
          </button>
        </div>
      </Card>

      {/* CONFIRMATION SAFETY MODAL */}
      <AlertDialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <AlertDialogContent className="bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6 md:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="size-7 text-rose-600" />
              {isFullReset ? "Confirm Complete 5-Module ERP Format?" : "Confirm Selected ERP Modules Format?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#7c533f] space-y-3 pt-2">
              <p>You are about to format the following modules:</p>
              <ul className="list-disc pl-5 space-y-1 font-semibold text-[#4a1c14]">
                {formatStudents && <li>👥 Students Module (All students, cards & fingerprints)</li>}
                {formatServices && <li>🛠️ Services Module (All services & price lists)</li>}
                {formatSettings && <li>⚙️ Limits & Messages Module (Reset to factory defaults)</li>}
                {formatReports && <li>📄 Reports Module (All transaction slips & revenue ledger)</li>}
                {formatStaffUsers && <li>🛡️ Users & Roles Module (All staff accounts)</li>}
              </ul>
              <p className="text-rose-700 font-bold">
                ⚠️ Warning: Once formatted, deleted records cannot be recovered!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-3 pt-6 border-t border-[#e5d8c5]">
            <AlertDialogCancel
              disabled={formatMutation.isPending}
              className="btn-luxury-secondary px-5 py-2.5 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={formatMutation.isPending}
              onClick={handleConfirmExecute}
              className="btn-luxury-danger px-6 py-2.5 text-xs gap-2"
            >
              {formatMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Formatting Modules...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Yes, Format Selected Now
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
