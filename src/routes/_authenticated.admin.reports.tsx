import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Download,
  ArrowUpDown,
  RotateCcw,
  FileSpreadsheet,
  IndianRupee,
  Receipt,
  Users,
  Search,
  Calendar,
  Filter,
  Printer,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ReceiptSlip, type ReceiptData } from "@/components/ReceiptSlip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { updateTransactionServer, deleteTransactionServer } from "@/lib/transactions.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Transactions Ledger — Gurukul Kiosk ERP" },
      { name: "description", content: "Filter kiosk transactions, print full reports, reprint thermal receipts, edit or delete entries, and export to Excel." },
    ],
  }),
  component: ReportsPage,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type SortKey = "name" | "suid" | "service" | "amount" | "date" | "receipt";

const QUICK_RANGES = [
  { key: "today", label: "Today" },
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
] as const;

type TransactionRow = {
  id: string;
  receipt_no: number;
  nfc_no: string;
  suid: string;
  student_name: string;
  service_name: string;
  amount: number;
  created_at: string;
};

function ReportsPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useCurrentUser();
  const updateTxFn = useServerFn(updateTransactionServer);
  const deleteTxFn = useServerFn(deleteTransactionServer);

  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [service, setService] = useState("all");
  const [text, setText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);

  // Printing Modes: "slip" | "report"
  const [printMode, setPrintMode] = useState<"slip" | "report">("slip");
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [kioskTitle, setKioskTitle] = useState("SHREE SWAMINARAYAN GURUKUL, RAJKOT");
  const [receiptFooter, setReceiptFooter] = useState("Jay Swaminarayan");

  // Edit Transaction State
  const [editingRow, setEditingRow] = useState<TransactionRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editService, setEditService] = useState("");

  // Delete Transaction State
  const [deletingRow, setDeletingRow] = useState<TransactionRow | null>(null);

  // Fetch settings for title and footer
  useQuery({
    queryKey: ["settings-receipt"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        if (map["kiosk_title"]) setKioskTitle(map["kiosk_title"]);
        if (map["receipt_footer"]) setReceiptFooter(map["receipt_footer"]);
      }
      return data;
    },
  });

  const services = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const report = useQuery({
    queryKey: ["report", from, to],
    queryFn: async () => {
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T23:59:59.999`);
      const { data, error } = await supabase
        .from("transactions")
        .select("id, receipt_no, nfc_no, suid, student_name, service_name, amount, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as TransactionRow[];
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingRow) return;
      const numAmount = Number(editAmount);
      if (isNaN(numAmount) || numAmount < 0) {
        throw new Error("Please enter a valid amount");
      }
      if (!editService.trim()) {
        throw new Error("Please select a service name");
      }

      await updateTxFn({
        data: {
          id: editingRow.id,
          amount: numAmount,
          service_name: editService.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Transaction updated successfully!");
      setEditingRow(null);
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update transaction");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRow) return;
      await deleteTxFn({
        data: {
          id: deletingRow.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("Transaction entry deleted successfully!");
      setDeletingRow(null);
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete transaction");
    },
  });

  function handlePrintReceipt(row: TransactionRow) {
    setPrintMode("slip");
    const rData: ReceiptData = {
      receiptNo: row.receipt_no,
      suid: row.suid,
      name: row.student_name,
      service: row.service_name,
      amount: Number(row.amount),
      at: row.created_at,
    };
    setActiveReceipt(rData);
    toast.success(`Printing Receipt #${String(row.receipt_no).padStart(4, "0")} for ${row.student_name}`);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print trigger failed:", e);
      }
    }, 100);
  }

  function handlePrintFullReport() {
    if (rows.length === 0) {
      toast.error("No transactions to print for these filters");
      return;
    }
    setPrintMode("report");
    toast.success(`Printing Full Ledger Report (${rows.length} entries)`);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print trigger failed:", e);
      }
    }, 100);
  }

  function openEdit(row: TransactionRow) {
    setEditingRow(row);
    setEditAmount(String(row.amount));
    setEditService(row.service_name);
  }

  function applyQuickRange(key: (typeof QUICK_RANGES)[number]["key"]) {
    const today = new Date();
    if (key === "today") {
      setFrom(isoDate(today));
      setTo(isoDate(today));
      return;
    }
    if (key === "month") {
      setFrom(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      setTo(isoDate(today));
      return;
    }
    const days = Number(key);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    setFrom(isoDate(start));
    setTo(isoDate(today));
  }

  function resetFilters() {
    setFrom(isoDate(new Date()));
    setTo(isoDate(new Date()));
    setService("all");
    setText("");
    setSortKey("date");
    setAsc(false);
  }

  const rows = useMemo(() => {
    const q = text.trim().toLowerCase();
    const filtered = (report.data ?? []).filter((r) => {
      if (service !== "all" && r.service_name !== service) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.suid.toLowerCase().includes(q) ||
        (r.nfc_no && r.nfc_no.toLowerCase().includes(q)) ||
        String(r.receipt_no).includes(q)
      );
    });
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.student_name.localeCompare(b.student_name) * dir;
        case "suid":
          return a.suid.localeCompare(b.suid) * dir;
        case "service":
          return a.service_name.localeCompare(b.service_name) * dir;
        case "amount":
          return (Number(a.amount) - Number(b.amount)) * dir;
        case "receipt":
          return (Number(a.receipt_no) - Number(b.receipt_no)) * dir;
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });
  }, [report.data, service, text, sortKey, asc]);

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);
  const uniqueStudents = new Set(rows.map((r) => r.suid)).size;
  const avgAmount = rows.length > 0 ? (totalAmount / rows.length).toFixed(1) : "0";

  function exportExcel() {
    if (rows.length === 0) {
      toast.error("Nothing to export for these filters");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "Receipt No": r.receipt_no,
        "Date": new Date(r.created_at).toLocaleDateString("en-IN"),
        "Time": new Date(r.created_at).toLocaleTimeString("en-IN"),
        "SUID": r.suid,
        "Student Name": r.student_name,
        "Service": r.service_name,
        "Amount (Rs)": Number(r.amount),
        "Card / NFC": r.nfc_no,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Gurukul-Kiosk-Report-${from}-to-${to}.xlsx`);
    toast.success("Excel report exported successfully!");
  }

  function header(label: string, key: SortKey) {
    return (
      <th className="py-3 pr-4">
        <button
          type="button"
          className="inline-flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-[#7c533f] hover:text-[#4a1c14] transition-colors"
          onClick={() => {
            if (sortKey === key) setAsc(!asc);
            else {
              setSortKey(key);
              setAsc(true);
            }
          }}
        >
          {label}
          <ArrowUpDown className={`size-3.5 ${sortKey === key ? "text-[#8b2500]" : "opacity-30"}`} />
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      {/* 1. Thermal Receipt Slip Component (For Single Slip Print) */}
      {printMode === "slip" && activeReceipt && (
        <ReceiptSlip title={kioskTitle} receipt={activeReceipt} footerText={receiptFooter} />
      )}

      {/* 2. Full A4 Report Printable Template (For Full Report Print) */}
      {printMode === "report" && (
        <div id="print-report" className="hidden print:block text-black p-6 font-sans">
          <div className="text-center border-b-2 border-black pb-4 mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider">{kioskTitle}</h1>
            <p className="text-xs font-semibold text-gray-700 uppercase">Cashless Service Transactions Ledger Report</p>
            <p className="text-xs text-gray-600 mt-1">Period: {from} to {to} | Total Entries: {rows.length}</p>
          </div>

          {/* Summary KPIs in Print */}
          <div className="grid grid-cols-4 gap-2 mb-4 border border-black p-3 text-center text-xs">
            <div>
              <span className="font-bold block text-gray-600">Total Revenue</span>
              <strong className="text-sm">₹{totalAmount.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span className="font-bold block text-gray-600">Slips Generated</span>
              <strong className="text-sm">{rows.length}</strong>
            </div>
            <div>
              <span className="font-bold block text-gray-600">Unique Students</span>
              <strong className="text-sm">{uniqueStudents}</strong>
            </div>
            <div>
              <span className="font-bold block text-gray-600">Average Spend</span>
              <strong className="text-sm">₹{avgAmount}</strong>
            </div>
          </div>

          {/* Printable Table */}
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100 font-bold">
                <th className="py-2 px-2">Receipt #</th>
                <th className="py-2 px-2">Date & Time</th>
                <th className="py-2 px-2">SUID</th>
                <th className="py-2 px-2">Student Name</th>
                <th className="py-2 px-2">Service</th>
                <th className="py-2 px-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {rows.map((r) => {
                const at = new Date(r.created_at);
                return (
                  <tr key={r.id}>
                    <td className="py-2 px-2 font-mono font-bold">#{String(r.receipt_no).padStart(5, "0")}</td>
                    <td className="py-2 px-2">{at.toLocaleDateString("en-IN")} {at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 px-2 font-mono">{r.suid}</td>
                    <td className="py-2 px-2 font-semibold">{r.student_name}</td>
                    <td className="py-2 px-2">{r.service_name}</td>
                    <td className="py-2 px-2 text-right font-bold">₹{Number(r.amount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold bg-gray-50">
                <td colSpan={5} className="py-2 px-2 text-right uppercase">Total Filtered Amount:</td>
                <td className="py-2 px-2 text-right text-sm">₹{totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-8 text-center text-xs border-t border-gray-400 pt-3">
            <p className="font-bold">{receiptFooter}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Generated on {new Date().toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="size-8 text-[#8b2500]" /> Reports & Transactions Ledger
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Print full report summaries, reprint thermal receipts, edit or delete entries, and export to Excel.
          </p>
        </div>

        {/* Header Action Buttons: Print Report + Export Excel */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintFullReport}
            disabled={rows.length === 0}
            className="btn-luxury-secondary px-5 py-2.5 text-xs gap-2 shadow-md disabled:opacity-50"
          >
            <Printer className="size-4 text-[#8b2500]" /> Print Report ({rows.length})
          </button>

          <button
            type="button"
            onClick={exportExcel}
            disabled={rows.length === 0}
            className="btn-luxury-primary px-6 py-2.5 text-xs gap-2 shadow-lg disabled:opacity-50"
          >
            <Download className="size-4" /> Export Excel ({rows.length})
          </button>
        </div>
      </header>

      {/* 4 SUMMARY KPI TILES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-luxury p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7c533f] uppercase">Total Filtered Revenue</span>
            <div className="size-9 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center justify-center">
              <IndianRupee className="size-4.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-extrabold text-[#8b2500]">
            ₹{totalAmount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#7c533f]">{from} to {to}</p>
        </Card>

        <Card className="card-luxury p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7c533f] uppercase">Slips Generated</span>
            <div className="size-9 rounded-2xl bg-blue-500/15 text-blue-700 border border-blue-500/30 flex items-center justify-center">
              <Receipt className="size-4.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-extrabold text-blue-800">
            {rows.length}
          </div>
          <p className="text-[11px] text-[#7c533f]">Total transactions</p>
        </Card>

        <Card className="card-luxury p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7c533f] uppercase">Unique Students</span>
            <div className="size-9 rounded-2xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center">
              <Users className="size-4.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-extrabold text-emerald-800">
            {uniqueStudents}
          </div>
          <p className="text-[11px] text-[#7c533f]">Students availed services</p>
        </Card>

        <Card className="card-luxury p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7c533f] uppercase">Average Ticket</span>
            <div className="size-9 rounded-2xl bg-purple-500/15 text-purple-700 border border-purple-500/30 flex items-center justify-center">
              <IndianRupee className="size-4.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-extrabold text-purple-800">
            ₹{avgAmount}
          </div>
          <p className="text-[11px] text-[#7c533f]">Avg spend per slip</p>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <Card className="card-luxury p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d8c5] pb-3">
          <span className="text-sm font-bold text-[#4a1c14] flex items-center gap-2">
            <Filter className="size-4 text-[#8b2500]" /> Query Filters
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RANGES.map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => applyQuickRange(q.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#faf6ef] hover:bg-[#8b2500] hover:text-white border border-[#d8c5af] text-[#6b4a3a] transition-all"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs font-bold text-[#7c533f]">From Date</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-luxury h-10 text-xs font-mono font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs font-bold text-[#7c533f]">To Date</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-luxury h-10 text-xs font-mono font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#7c533f]">Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="input-luxury h-10 text-xs font-semibold">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {(services.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q" className="text-xs font-bold text-[#7c533f]">Search Student / SUID</Label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-3 text-[#7c533f]/50" />
              <Input
                id="q"
                placeholder="Search name, SUID, slip..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-luxury h-10 pl-9 text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="btn-luxury-secondary h-10 px-4 text-xs gap-1.5"
          >
            <RotateCcw className="size-4" /> Reset Filters
          </button>
        </div>
      </Card>

      {/* TRANSACTIONS DATA TABLE WITH PER-ENTRY ACTIONS */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold">
                {header("Receipt #", "receipt")}
                {header("Date & Time", "date")}
                {header("SUID", "suid")}
                {header("Student Name", "name")}
                {header("Service", "service")}
                {header("Amount (₹)", "amount")}
                <th className="py-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5d8c5]/60 font-mono text-xs">
              {rows.map((r) => {
                const at = new Date(r.created_at);
                return (
                  <tr key={r.id} className="table-row-luxury hover:bg-[#faf4eb]">
                    <td className="py-3.5 pr-4 font-bold text-[#4a1c14]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af]">
                        #{String(r.receipt_no).padStart(5, "0")}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-[#7c533f]">
                      {at.toLocaleDateString("en-IN")}, {at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-[#8b2500]">
                      {r.suid}
                    </td>
                    <td className="py-3.5 pr-4 font-sans font-bold text-sm text-[#2c1810]">
                      {r.student_name}
                    </td>
                    <td className="py-3.5 pr-4 font-sans">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#faf6ef] text-[#4a1c14] border border-[#d8c5af]">
                        {r.service_name}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-extrabold text-sm text-[#8b2500]">
                      ₹{Number(r.amount).toFixed(2)}
                    </td>

                    {/* Per-Entry Actions: Print Receipt, Edit, Delete */}
                    <td className="py-3.5 pl-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="Reprint Thermal Receipt Slip"
                          onClick={() => handlePrintReceipt(r)}
                          className="btn-luxury-secondary px-3 py-1.5 text-xs gap-1.5 shadow-sm text-[#4a1c14] hover:text-[#8b2500]"
                        >
                          <Printer className="size-3.5 text-[#8b2500]" /> Print
                        </button>

                        <button
                          type="button"
                          title="Edit Entry Amount/Service"
                          onClick={() => openEdit(r)}
                          className="btn-luxury-secondary px-3 py-1.5 text-xs gap-1.5 shadow-sm text-[#4a1c14]"
                        >
                          <Pencil className="size-3.5 text-amber-700" /> Edit
                        </button>

                        <button
                          type="button"
                          title="Delete Transaction"
                          onClick={() => setDeletingRow(r)}
                          className="btn-luxury-danger px-2.5 py-1.5 text-xs shadow-sm"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#7c533f] font-sans">
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EDIT TRANSACTION MODAL */}
      <Dialog open={editingRow !== null} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-md bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-bold text-[#4a1c14] flex items-center gap-2">
              <Pencil className="size-6 text-[#8b2500]" /> Edit Transaction Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Modify charged amount or service type for Receipt #{editingRow?.receipt_no} ({editingRow?.student_name}).
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7c533f]">Student</Label>
              <div className="p-3 rounded-xl bg-[#faf6ef] border border-[#d8c5af] text-xs space-y-0.5">
                <p className="font-bold text-[#4a1c14]">{editingRow?.student_name}</p>
                <p className="font-mono text-[#7c533f]">SUID: {editingRow?.suid}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-svc" className="text-xs font-bold text-[#7c533f]">Service Name *</Label>
              <Select value={editService} onValueChange={setEditService}>
                <SelectTrigger className="input-luxury h-10 text-sm font-semibold">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  {(services.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {/* Keep original service name if deleted */}
                  {editingRow && !(services.data ?? []).some((s) => s.name === editingRow.service_name) && (
                    <SelectItem value={editingRow.service_name}>
                      {editingRow.service_name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-amt" className="text-xs font-bold text-[#7c533f]">Amount Charged (₹) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7c533f]">₹</span>
                <Input
                  id="edit-amt"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="input-luxury pl-8 h-10 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-[#e5d8c5]">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="btn-luxury-secondary px-5 py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="btn-luxury-primary px-6 py-2.5 text-xs gap-2"
              >
                {editMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Transaction Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE TRANSACTION CONFIRMATION DIALOG */}
      <AlertDialog open={deletingRow !== null} onOpenChange={(open) => !open && setDeletingRow(null)}>
        <AlertDialogContent className="bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-serif font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Transaction Entry?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#7c533f] space-y-2 pt-2">
              <p>
                Are you sure you want to permanently delete <strong>Receipt #{deletingRow?.receipt_no}</strong> (₹{deletingRow?.amount} - {deletingRow?.service_name}) for <strong>{deletingRow?.student_name}</strong>?
              </p>
              <p className="text-rose-700 font-bold text-xs">
                This transaction will be completely removed from the ledger and daily totals.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4 border-t border-[#e5d8c5]">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="btn-luxury-secondary px-4 py-2 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="btn-luxury-danger px-5 py-2 text-xs gap-2"
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
