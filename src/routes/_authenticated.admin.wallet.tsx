import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Wallet,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Coins,
  Users,
  Search,
  RotateCcw,
  Loader2,
  FileCheck,
  ArrowRight,
  Filter,
  PlusCircle,
  MinusCircle,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  importDailyLedgerServer,
  getWalletLedgerDataServer,
  manualWalletTransactionServer,
  type DailyLedgerRow,
} from "@/lib/daily-ledger.functions";

export const Route = createFileRoute("/_authenticated/admin/wallet")({
  head: () => ({
    meta: [
      { title: "Student Wallet & Ledger — Gurukul Kiosk ERP" },
      {
        name: "description",
        content:
          "Manage student wallets, upload daily Excel transaction reports with live preview, and review balance ledgers.",
      },
    ],
  }),
  component: WalletPage,
});

export default function WalletPage() {
  const importFn = useServerFn(importDailyLedgerServer);
  const getWalletDataFn = useServerFn(getWalletLedgerDataServer);
  const manualTxFn = useServerFn(manualWalletTransactionServer);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab: "upload" | "balances" | "history"
  const [activeTab, setActiveTab] = useState<"upload" | "balances" | "history">("upload");

  // Excel Upload States
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<DailyLedgerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    batch: number;
    totalBatches: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    totalInserted: number;
    newStudentsCreated: number;
  } | null>(null);

  // Database Ledger & Balances State
  const [loadingData, setLoadingData] = useState(false);
  const [ledgerTxns, setLedgerTxns] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [balanceSearch, setBalanceSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // Manual Adjust Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualGrNo, setManualGrNo] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [manualType, setManualType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [manualAmount, setManualAmount] = useState("");
  const [manualComment, setManualComment] = useState("");
  const [manualMode, setManualMode] = useState("Cash");
  const [savingManual, setSavingManual] = useState(false);

  // Load database ledger & student balances
  const loadLedgerData = async () => {
    setLoadingData(true);
    try {
      const res = await getWalletDataFn();
      setLedgerTxns(res.transactions || []);
      setAllStudents(res.students || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load wallet data.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === "balances" || activeTab === "history") {
      loadLedgerData();
    }
  }, [activeTab]);

  // --------------------------------------------------------------------------
  // 1. Download Sample Excel Template Matching User's Format
  // --------------------------------------------------------------------------
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Sl.No": 18228,
        Date: "23-06-2026 17:43",
        Type: "Debit",
        Mode: "Cash",
        "Student ID": "250674",
        "Student Name": "NILKANTH JAGJIVANBHAI MATHOLIYA",
        "GR No": "30431",
        Class: "GM 10 (Hostel) · B",
        Amount: -20.0,
        Comments: "Harijayanti",
      },
      {
        "Sl.No": 18229,
        Date: "23-06-2026 17:43",
        Type: "Credit",
        Mode: "Cash",
        "Student ID": "250634",
        "Student Name": "OM SHIRISHBHAI MARADIYA",
        "GR No": "30202",
        Class: "GM 10 (Hostel) · B",
        Amount: 500.0,
        Comments: "Pocket money deposit",
      },
      {
        "Sl.No": 18230,
        Date: "23-06-2026 17:43",
        Type: "Debit",
        Mode: "Cash",
        "Student ID": "250877",
        "Student Name": "JASH MAHESHBHAI AMIPARA",
        "GR No": "30362",
        Class: "GM 10 (Hostel) · E",
        Amount: -50.0,
        Comments: "Stationery / Books",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet["!cols"] = [
      { wch: 10 }, // Sl.No
      { wch: 18 }, // Date
      { wch: 10 }, // Type
      { wch: 10 }, // Mode
      { wch: 14 }, // Student ID
      { wch: 34 }, // Student Name
      { wch: 12 }, // GR No
      { wch: 22 }, // Class
      { wch: 12 }, // Amount
      { wch: 30 }, // Comments
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily_Report");
    XLSX.writeFile(workbook, "Gurukul_Wallet_Report_Template.xlsx");
    toast.success("Sample template downloaded (Gurukul_Wallet_Report_Template.xlsx)");
  };

  // --------------------------------------------------------------------------
  // 2. Parse Uploaded Excel File
  // --------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rawJson.length === 0) {
          toast.error("The selected file is empty or has no recognizable rows.");
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        const normalized: DailyLedgerRow[] = [];
        let skippedCount = 0;

        rawJson.forEach((row) => {
          // Robust column extraction supporting user's exact Excel layout (Image 2)
          const uniqueNo = String(
            row["Student ID"] ||
            row["STUDENT ID"] ||
            row["Student Id"] ||
            row["UNIQUE/HR NO."] ||
            row["UNIQUE NO"] ||
            row["VOUCHER NO"] ||
            row["HR NO"] ||
            ""
          ).trim();

          const studentName = String(
            row["Student Name"] ||
            row["STUDENT NAME"] ||
            row["NAME"] ||
            row["Student"] ||
            row["STUDENT"] ||
            ""
          ).trim();

          const grNo = String(
            row["GR No"] ||
            row["GR NO"] ||
            row["GR NO."] ||
            row["Gr No"] ||
            row["GR"] ||
            row["ROLL NO"] ||
            ""
          ).trim();

          const className = String(
            row["Class"] ||
            row["CLASS"] ||
            row["STD"] ||
            row["DIVISION"] ||
            ""
          ).trim();

          const rawType = String(
            row["Type"] ||
            row["TYPE"] ||
            row["TRANSACTION TYPE"] ||
            ""
          ).trim().toUpperCase();

          const rawAmtStr = String(
            row["Amount"] ||
            row["AMOUNT"] ||
            row["TOTAL AMOUNT"] ||
            row["RS"] ||
            "0"
          ).trim();

          // If amount is negative (-20.00), it's a Debit!
          const isNegative = rawAmtStr.startsWith("-");
          const type: "CREDIT" | "DEBIT" =
            rawType.includes("DEBIT") || rawType === "DR" || isNegative
              ? "DEBIT"
              : "CREDIT";

          const mode = String(
            row["Mode"] ||
            row["MODE"] ||
            row["PAYMENT MODE"] ||
            "Cash"
          ).trim();

          const date = String(
            row["Date"] ||
            row["DATE"] ||
            ""
          ).trim();

          const cleanAmt = rawAmtStr.replace(/[^0-9.]/g, "");
          const amount = parseFloat(cleanAmt);

          const comment = String(
            row["Comments"] ||
            row["COMMENTS"] ||
            row["Comment"] ||
            row["COMMENT"] ||
            row["REMARK"] ||
            row["PARTICULAR"] ||
            ""
          ).trim();

          if (!grNo && !uniqueNo && !studentName) {
            skippedCount++;
            return;
          }

          if (isNaN(amount) || amount <= 0) {
            skippedCount++;
            return;
          }

          normalized.push({
            unique_no: uniqueNo || grNo,
            student_name: studentName || `Student (${uniqueNo || grNo})`,
            gr_no: grNo || uniqueNo || "N/A",
            class_name: className,
            type,
            mode,
            date,
            amount,
            comment,
          });
        });

        if (normalized.length === 0) {
          toast.error("Could not find valid rows with GR No/Name and positive Amount.");
        } else {
          setParsedRows(normalized);
          toast.success(`Successfully parsed ${normalized.length} rows for preview.`);
          if (skippedCount > 0) {
            toast.info(`Skipped ${skippedCount} rows with missing GR No or zero amount.`);
          }
        }
      } catch (err: any) {
        toast.error(`Error reading Excel file: ${err?.message || "Invalid format"}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the file.");
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // --------------------------------------------------------------------------
  // 3. Confirm & Import to Database
  // --------------------------------------------------------------------------
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setIsImporting(true);
    const BATCH_SIZE = 500;
    const totalRows = parsedRows.length;
    const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
    let totalInserted = 0;
    let newStudentsCreated = 0;

    try {
      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const currentProgress = Math.min(i + batch.length, totalRows);
        const percent = Math.round((currentProgress / totalRows) * 100);

        setImportProgress({
          current: currentProgress,
          total: totalRows,
          percent,
          batch: batchNum,
          totalBatches,
        });

        const res = await importFn({
          data: {
            rows: batch,
            batchNote: `Uploaded batch ${batchNum}/${totalBatches} on ${new Date().toLocaleDateString("en-IN")}`,
          },
        });

        totalInserted += res.totalInserted ?? 0;
        newStudentsCreated += res.newStudentsCreated ?? 0;
      }

      setImportResult({
        totalInserted,
        newStudentsCreated,
      });

      toast.success(`Wallet successfully updated! All ${totalInserted.toLocaleString()} ledger transactions saved.`);
      if (newStudentsCreated > 0) {
        toast.info(`${newStudentsCreated.toLocaleString()} new student accounts automatically registered.`);
      }

      setParsedRows([]);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message || "Failed to import ledger entries into database.");
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setSearchQuery("");
    setFilterType("ALL");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Preview Totals
  const previewTotals = useMemo(() => {
    let creditTotal = 0;
    let debitTotal = 0;
    parsedRows.forEach((r) => {
      if (r.type === "CREDIT") creditTotal += r.amount;
      else debitTotal += r.amount;
    });
    return {
      count: parsedRows.length,
      credit: creditTotal,
      debit: debitTotal,
      net: creditTotal - debitTotal,
    };
  }, [parsedRows]);

  // Filtered Preview Rows
  const filteredPreviewRows = useMemo(() => {
    return parsedRows.filter((r) => {
      if (filterType === "CREDIT" && r.type !== "CREDIT") return false;
      if (filterType === "DEBIT" && r.type !== "DEBIT") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.gr_no.toLowerCase().includes(q) ||
        r.class_name.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.unique_no.toLowerCase().includes(q)
      );
    });
  }, [parsedRows, filterType, searchQuery]);

  // Student Balances Calculation from DB
  const studentBalances = useMemo(() => {
    const map = new Map<string, { credit: number; debit: number; txCount: number }>();

    ledgerTxns.forEach((tx) => {
      const gr = (tx.suid || "").trim();
      if (!gr) return;
      if (!map.has(gr)) {
        map.set(gr, { credit: 0, debit: 0, txCount: 0 });
      }
      const entry = map.get(gr)!;
      entry.txCount += 1;
      const sName = (tx.service_name || "").toLowerCase();
      const isCredit =
        sName.includes("credit") ||
        sName.includes("deposit") ||
        sName.includes("pocket") ||
        sName.includes("sbi") ||
        tx.amount < 0;

      const amt = Math.abs(Number(tx.amount) || 0);
      if (isCredit) {
        entry.credit += amt;
      } else {
        entry.debit += amt;
      }
    });

    return allStudents.map((s) => {
      const stats = map.get((s.suid || "").trim()) || { credit: 0, debit: 0, txCount: 0 };
      const balance = stats.credit - stats.debit;
      return {
        ...s,
        totalCredit: stats.credit,
        totalDebit: stats.debit,
        balance,
        txCount: stats.txCount,
      };
    });
  }, [allStudents, ledgerTxns]);

  const filteredStudentBalances = useMemo(() => {
    if (!balanceSearch.trim()) return studentBalances;
    const q = balanceSearch.toLowerCase();
    return studentBalances.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.suid || "").toLowerCase().includes(q) ||
        (s.class_name || "").toLowerCase().includes(q)
    );
  }, [studentBalances, balanceSearch]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return ledgerTxns;
    const q = historySearch.toLowerCase();
    return ledgerTxns.filter(
      (tx) =>
        (tx.student_name || "").toLowerCase().includes(q) ||
        (tx.suid || "").toLowerCase().includes(q) ||
        (tx.service_name || "").toLowerCase().includes(q) ||
        (tx.receipt_no || "").toLowerCase().includes(q)
    );
  }, [ledgerTxns, historySearch]);

  // Handle Manual Transaction Save
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!manualGrNo.trim()) {
      toast.error("Please enter Student GR No.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSavingManual(true);
    try {
      await manualTxFn({
        data: {
          gr_no: manualGrNo.trim(),
          student_name: manualStudentName.trim() || undefined,
          type: manualType,
          amount: amt,
          comment: manualComment.trim() || (manualType === "CREDIT" ? "Cash Top-up" : "Manual Debit"),
          mode: manualMode,
        },
      });

      toast.success(`Successfully recorded ₹${amt} ${manualType} for GR ${manualGrNo}`);
      setManualModalOpen(false);
      setManualGrNo("");
      setManualStudentName("");
      setManualAmount("");
      setManualComment("");
      loadLedgerData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add manual entry.");
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-[#2c1810]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5d8c5]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-[#8b2500] to-amber-700 text-white shadow-sm">
              <Wallet className="size-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#3b190f]">
              Student Wallet & Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#7c533f] mt-1 font-medium">
            Upload daily Excel ledger reports, preview entries in real-time, and manage student wallet balances.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={downloadSampleTemplate}
            variant="outline"
            className="border-amber-300 hover:bg-amber-50 text-[#8b2500] font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
          >
            <Download className="size-3.5" /> Sample Template
          </Button>

          <Button
            onClick={() => {
              setManualType("CREDIT");
              setManualModalOpen(true);
            }}
            className="bg-[#8b2500] hover:bg-[#a32c00] text-white font-bold text-xs gap-1.5 rounded-xl cursor-pointer shadow-sm"
          >
            <PlusCircle className="size-3.5" /> Manual Top-Up
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#e5d8c5] pb-2">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "upload"
              ? "bg-[#8b2500] text-white shadow-sm"
              : "bg-white/80 hover:bg-white text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <Upload className="size-4" /> Upload Daily Report
        </button>

        <button
          onClick={() => setActiveTab("balances")}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "balances"
              ? "bg-[#8b2500] text-white shadow-sm"
              : "bg-white/80 hover:bg-white text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <Coins className="size-4" /> Student Balances
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-[#8b2500] text-white shadow-sm"
              : "bg-white/80 hover:bg-white text-[#7c533f] border border-[#e5d8c5]"
          }`}
        >
          <History className="size-4" /> Transaction History
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXCEL REPORT UPLOAD WITH TWO-STEP PREVIEW FLOW                      */}
      {/* ========================================================================= */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* Success Banner after import */}
          {importResult && (
            <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/70 border-2 border-emerald-400 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
                <CheckCircle2 className="size-9 text-emerald-600 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-serif font-extrabold text-[#3b190f]">
                  🎉 Daily Ledger Report Uploaded Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-[#7c533f] mt-1.5 font-medium max-w-lg mx-auto">
                  All <strong className="font-mono text-emerald-800 text-base">{importResult.totalInserted.toLocaleString()}</strong> transactions have been safely processed and updated in the student accounts database.
                </p>
              </div>

              <div className="grid grid-cols-2 max-w-md mx-auto gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Transactions Saved</p>
                  <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                    {importResult.totalInserted.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c533f]">New Students Added</p>
                  <p className="text-2xl font-black font-mono text-[#8b2500] mt-1">
                    {importResult.newStudentsCreated.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Button
                  onClick={() => {
                    setImportResult(null);
                    setActiveTab("balances");
                  }}
                  className="bg-[#8b2500] hover:bg-[#a32c00] text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md"
                >
                  <Wallet className="size-4 mr-1.5" /> View Student Balances
                </Button>
                <Button
                  onClick={() => setImportResult(null)}
                  variant="outline"
                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Upload Another Report
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: Upload Drag & Drop Zone */}
          {parsedRows.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center bg-white/80 backdrop-blur-md border-2 border-dashed border-[#d8c5af] hover:border-[#8b2500] rounded-3xl transition-all shadow-xs group">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-file-input"
                disabled={isProcessing}
              />

              <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
                <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8b2500] group-hover:scale-105 group-hover:bg-amber-100 transition-all">
                  {isProcessing ? (
                    <Loader2 className="size-8 animate-spin text-[#8b2500]" />
                  ) : (
                    <FileSpreadsheet className="size-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#3b190f]">
                    {isProcessing ? "Reading Excel File..." : "Upload Daily Ledger Report"}
                  </h3>
                  <p className="text-xs text-[#7c533f]">
                    Drag and drop your Excel file here, or click the button below to browse. Supports{" "}
                    <span className="font-semibold">.xlsx, .xls, .csv</span>
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="excel-file-input"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b2500] to-amber-700 text-white font-bold text-xs cursor-pointer shadow-md hover:from-[#a32c00] hover:to-amber-600 transition-all"
                  >
                    <Upload className="size-4" />
                    Select Excel File
                  </label>

                  <Button
                    onClick={downloadSampleTemplate}
                    variant="outline"
                    className="border-[#d8c5af] text-[#7c533f] hover:text-[#8b2500] text-xs font-semibold rounded-xl"
                  >
                    <Download className="size-3.5 mr-1" /> Template Format
                  </Button>
                </div>

                {/* Column Format Helper */}
                <div className="mt-4 pt-4 border-t border-[#f2e7db] text-[11px] text-[#7c533f] w-full text-left space-y-1">
                  <p className="font-bold text-[#8b2500]">Expected Excel Columns:</p>
                  <p className="font-mono text-[10px] text-[#8b6553] bg-[#faf5ee] p-2 rounded-lg border border-[#f0e4d4]">
                    UNIQUE/HR NO. | STUDENT NAME | GR NO. | CLASS | TYPE (Credit/Debit) | MODE | DATE | AMOUNT | COMMENT
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            /* STEP 2: LIVE INTERACTIVE PREVIEW BEFORE UPLOAD */
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* File Info Bar & Reset */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="size-5 text-[#8b2500]" />
                  <span className="text-xs font-bold text-[#3b190f]">
                    Previewing: <span className="font-mono text-[#8b2500]">{fileName}</span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {parsedRows.length} Rows Detected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="sm"
                    className="text-xs border-[#d8c5af] text-[#7c533f] hover:text-rose-700 rounded-xl"
                  >
                    <RotateCcw className="size-3 mr-1" /> Select Different File
                  </Button>

                  <Button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="bg-[#8b2500] hover:bg-[#a32c00] text-white font-bold text-xs gap-1.5 rounded-xl shadow-md cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        {importProgress
                          ? `Uploading ${importProgress.percent}% (${importProgress.current.toLocaleString()}/${importProgress.total.toLocaleString()})...`
                          : "Saving to Database..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" /> Confirm & Upload to Wallet ({parsedRows.length.toLocaleString()})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Live Batch Upload Progress Bar */}
              {importProgress && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400/60 space-y-2 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-[#4a1c14]">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-[#8b2500]" />
                      Uploading Batch {importProgress.batch} of {importProgress.totalBatches} ({importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} rows)
                    </span>
                    <span className="font-mono text-[#8b2500] text-sm font-extrabold">{importProgress.percent}%</span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-amber-200/80 overflow-hidden p-0.5 border border-amber-300">
                    <div
                      className="h-full bg-gradient-to-r from-[#8b2500] via-amber-600 to-emerald-600 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7c533f]">
                    <span>Chunking {importProgress.total.toLocaleString()} records into safe 500-entry batches to prevent server payload limits.</span>
                    <span className="font-bold text-[#8b2500]">Please wait, uploading in progress...</span>
                  </div>
                </div>
              )}

              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Card className="p-4 bg-white border border-[#e5d8c5] rounded-2xl shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c533f] flex items-center justify-between">
                    Total Entries <Users className="size-3.5 text-[#8b2500]" />
                  </span>
                  <p className="text-2xl font-black font-sans text-[#3b190f] mt-1">
                    {previewTotals.count}
                  </p>
                  <span className="text-[10px] text-[#8b6553]">Rows in uploaded sheet</span>
                </Card>

                <Card className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
                    Total Credit <TrendingUp className="size-3.5 text-emerald-600" />
                  </span>
                  <p className="text-2xl font-black font-sans text-emerald-700 mt-1">
                    ₹{previewTotals.credit.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-emerald-600/80">Pocket money / Deposits</span>
                </Card>

                <Card className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
                    Total Debit <TrendingDown className="size-3.5 text-rose-600" />
                  </span>
                  <p className="text-2xl font-black font-sans text-rose-700 mt-1">
                    ₹{previewTotals.debit.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-rose-600/80">Spends & deductions</span>
                </Card>

                <Card className="p-4 bg-white border border-amber-200 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                    Net Impact <Coins className="size-3.5 text-amber-700" />
                  </span>
                  <p
                    className={`text-2xl font-black font-sans mt-1 ${
                      previewTotals.net >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {previewTotals.net >= 0 ? "+" : "-"}₹{Math.abs(previewTotals.net).toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-[#8b6553]">Credit minus debit</span>
                </Card>
              </div>

              {/* Table Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7c533f]" />
                  <Input
                    placeholder="Search by student name, GR No, class, comment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs rounded-xl bg-white border-[#e5d8c5] h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[#faf5ee] p-1 rounded-xl border border-[#e5d8c5] self-start sm:self-auto">
                  <button
                    onClick={() => setFilterType("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === "ALL"
                        ? "bg-[#8b2500] text-white shadow-xs"
                        : "text-[#7c533f] hover:text-[#3b190f]"
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterType("CREDIT")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === "CREDIT"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    Credit Only
                  </button>
                  <button
                    onClick={() => setFilterType("DEBIT")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === "DEBIT"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    Debit Only
                  </button>
                </div>
              </div>

              {/* Live Preview Table */}
              <Card className="overflow-hidden border border-[#e5d8c5] rounded-2xl bg-white shadow-xs">
                <div className="overflow-x-auto max-h-[460px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#f7efe6] border-b border-[#e5d8c5] z-10 text-[11px] uppercase tracking-wider text-[#7c533f] font-bold font-sans">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Unique/HR</th>
                        <th className="p-3">GR No</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Amount (₹)</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Comment / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2e7db]">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-[#7c533f]">
                            No rows matched your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row, idx) => {
                          const isCredit = row.type === "CREDIT";
                          return (
                            <tr
                              key={idx}
                              className="hover:bg-[#faf5ee] transition-colors font-sans text-xs"
                            >
                              <td className="p-3 font-mono text-[10px] text-[#7c533f]">{idx + 1}</td>
                              <td className="p-3 font-mono text-[11px] text-[#55362a]">
                                {row.unique_no || "—"}
                              </td>
                              <td className="p-3 font-mono font-bold text-[#8b2500]">
                                {row.gr_no}
                              </td>
                              <td className="p-3 font-bold text-[#2d140d]">{row.student_name}</td>
                              <td className="p-3 text-[#7c533f]">{row.class_name || "—"}</td>
                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    isCredit
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {isCredit ? (
                                    <TrendingUp className="size-3" />
                                  ) : (
                                    <TrendingDown className="size-3" />
                                  )}
                                  {row.type}
                                </span>
                              </td>
                              <td
                                className={`p-3 font-black font-mono text-sm ${
                                  isCredit ? "text-emerald-700" : "text-rose-700"
                                }`}
                              >
                                {isCredit ? "+" : "-"}₹{row.amount.toFixed(2)}
                              </td>
                              <td className="p-3 text-[#7c533f]">{row.mode || "Cash"}</td>
                              <td className="p-3 font-mono text-[11px] text-[#7c533f]">
                                {row.date || "Today"}
                              </td>
                              <td className="p-3 text-[#3b190f] max-w-xs truncate" title={row.comment}>
                                {row.comment || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Confirm Action Bar */}
                <div className="p-3.5 bg-[#f7efe6] border-t border-[#e5d8c5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#7c533f]">
                    Showing <span className="font-bold text-[#3b190f]">{filteredPreviewRows.length}</span> of{" "}
                    <span className="font-bold text-[#3b190f]">{parsedRows.length}</span> entries
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#7c533f] hover:text-rose-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="bg-[#8b2500] hover:bg-[#a32c00] text-white font-bold text-xs gap-1.5 rounded-xl px-5 shadow-sm cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          {importProgress
                            ? `Uploading ${importProgress.percent}% (${importProgress.current.toLocaleString()}/${importProgress.total.toLocaleString()})...`
                            : "Saving to Database..."}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" /> Confirm & Upload to Wallet
                          <ArrowRight className="size-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDENT WALLETS & BALANCES                                          */}
      {/* ========================================================================= */}
      {activeTab === "balances" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7c533f]" />
              <Input
                placeholder="Search student by Name, GR No, Class..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="pl-8 text-xs rounded-xl bg-white border-[#e5d8c5] h-9"
              />
            </div>

            <Button
              onClick={loadLedgerData}
              variant="outline"
              size="sm"
              disabled={loadingData}
              className="border-[#e5d8c5] text-xs text-[#7c533f] gap-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loadingData ? "animate-spin" : ""}`} /> Refresh Balances
            </Button>
          </div>

          <Card className="overflow-hidden border border-[#e5d8c5] rounded-2xl bg-white shadow-xs">
            <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f7efe6] border-b border-[#e5d8c5] z-10 text-[11px] uppercase tracking-wider text-[#7c533f] font-bold font-sans">
                  <tr>
                    <th className="p-3">GR No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Total Credit</th>
                    <th className="p-3">Total Used / Debit</th>
                    <th className="p-3">Available Balance (₹)</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e7db]">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#7c533f]">
                        <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#8b2500]" />
                        Loading student wallet balances...
                      </td>
                    </tr>
                  ) : filteredStudentBalances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#7c533f]">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentBalances.map((student) => {
                      return (
                        <tr key={student.id} className="hover:bg-[#faf5ee] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#8b2500]">{student.suid}</td>
                          <td className="p-3 font-bold text-[#2d140d]">{student.name}</td>
                          <td className="p-3 text-[#7c533f]">{student.class_name || "—"}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            ₹{student.totalCredit.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-700">
                            ₹{student.totalDebit.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                                student.balance >= 0
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              ₹{student.balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setManualGrNo(student.suid);
                                setManualStudentName(student.name);
                                setManualType("CREDIT");
                                setManualModalOpen(true);
                              }}
                              className="text-[11px] h-7 px-2.5 rounded-lg border-amber-300 text-[#8b2500] hover:bg-amber-50 cursor-pointer"
                            >
                              + Top-Up / Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ALL WALLET TRANSACTIONS                                             */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7c533f]" />
              <Input
                placeholder="Search transactions by student, service, receipt..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 text-xs rounded-xl bg-white border-[#e5d8c5] h-9"
              />
            </div>

            <Button
              onClick={loadLedgerData}
              variant="outline"
              size="sm"
              disabled={loadingData}
              className="border-[#e5d8c5] text-xs text-[#7c533f] gap-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loadingData ? "animate-spin" : ""}`} /> Refresh History
            </Button>
          </div>

          <Card className="overflow-hidden border border-[#e5d8c5] rounded-2xl bg-white shadow-xs">
            <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f7efe6] border-b border-[#e5d8c5] z-10 text-[11px] uppercase tracking-wider text-[#7c533f] font-bold font-sans">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">GR No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Service / Particular</th>
                    <th className="p-3">Amount (₹)</th>
                    <th className="p-3">Receipt / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e7db]">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#7c533f]">
                        <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#8b2500]" />
                        Loading transaction history...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#7c533f]">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((tx) => {
                      const sName = (tx.service_name || "").toLowerCase();
                      const isCredit =
                        sName.includes("credit") ||
                        sName.includes("deposit") ||
                        sName.includes("pocket") ||
                        sName.includes("sbi") ||
                        tx.amount < 0;

                      return (
                        <tr key={tx.id} className="hover:bg-[#faf5ee] transition-colors">
                          <td className="p-3 font-mono text-[11px] text-[#7c533f]">
                            {new Date(tx.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            ·{" "}
                            {new Date(tx.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#8b2500]">{tx.suid || "—"}</td>
                          <td className="p-3 font-bold text-[#2d140d]">{tx.student_name || "Student"}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                isCredit
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="size-3" />
                              ) : (
                                <ArrowUpRight className="size-3" />
                              )}
                              {isCredit ? "Credit" : "Debit"}
                            </span>
                          </td>
                          <td className="p-3 text-[#3b190f] max-w-sm truncate" title={tx.service_name}>
                            {tx.service_name}
                          </td>
                          <td
                            className={`p-3 font-mono font-black text-sm ${
                              isCredit ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#7c533f]">
                            {tx.receipt_no || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Manual Top-up / Debit Dialog */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-2 border-[#e5d8c5]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#3b190f] flex items-center gap-2">
              <Coins className="size-5 text-[#8b2500]" /> Manual Wallet Entry
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveManual} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-[#7c533f] block mb-1">Entry Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualType("CREDIT")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    manualType === "CREDIT"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  <PlusCircle className="size-4 text-emerald-600" /> Credit (Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setManualType("DEBIT")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    manualType === "DEBIT"
                      ? "bg-rose-50 border-rose-400 text-rose-800"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  <MinusCircle className="size-4 text-rose-600" /> Debit (Spend)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#7c533f] block mb-1">Student GR No *</label>
              <Input
                placeholder="e.g. 3319"
                value={manualGrNo}
                onChange={(e) => setManualGrNo(e.target.value)}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#7c533f] block mb-1">Student Name (Optional)</label>
              <Input
                placeholder="Student full name"
                value={manualStudentName}
                onChange={(e) => setManualStudentName(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#7c533f] block mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="500"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                  className="text-xs rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#7c533f] block mb-1">Payment Mode</label>
                <select
                  value={manualMode}
                  onChange={(e) => setManualMode(e.target.value)}
                  className="w-full text-xs rounded-xl border border-input bg-white px-3 py-2"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Voucher">Voucher</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#7c533f] block mb-1">Comment / Particular</label>
              <Input
                placeholder="e.g. Pocket money, scholarship, fee refund..."
                value={manualComment}
                onChange={(e) => setManualComment(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingManual}
                className="bg-[#8b2500] hover:bg-[#a32c00] text-white rounded-xl text-xs font-bold"
              >
                {savingManual ? <Loader2 className="size-3.5 animate-spin" /> : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
