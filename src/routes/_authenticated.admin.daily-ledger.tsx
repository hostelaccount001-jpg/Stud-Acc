import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
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
  ShieldCheck,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  importDailyLedgerServer,
  type DailyLedgerRow,
} from "@/lib/daily-ledger.functions";

export const Route = createFileRoute("/_authenticated/admin/daily-ledger")({
  head: () => ({
    meta: [
      { title: "Daily Ledger Import — Gurukul Kiosk ERP" },
      {
        name: "description",
        content:
          "Upload daily Excel ledger reports with live preview to credit or debit student balances for Kiosk authentication.",
      },
    ],
  }),
  component: DailyLedgerPage,
});

export default function DailyLedgerPage() {
  const importFn = useServerFn(importDailyLedgerServer);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<DailyLedgerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalInserted: number;
    newStudentsCreated: number;
  } | null>(null);

  // --------------------------------------------------------------------------
  // 1. Download Sample Excel Template Matching User's Exact Format
  // --------------------------------------------------------------------------
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "UNIQUE/HR NO.": "249388",
        "STUDENT NAME": "SHUBH CHANDRAKANTBHAI GAJERA",
        "GR NO.": "3319",
        CLASS: "11 COMMERCE-C",
        TYPE: "CREDIT",
        MODE: "Cash",
        DATE: "21/09/2026",
        AMOUNT: 500.0,
        COMMENT: "credit by shubh -500",
      },
      {
        "UNIQUE/HR NO.": "260172",
        "STUDENT NAME": "PRINCE ALPESHBHAI JAVIYA",
        "GR NO.": "30637",
        CLASS: "GM 9 (Hostel)-C",
        TYPE: "CREDIT",
        MODE: "Cash",
        DATE: "21/09/2026",
        AMOUNT: 90.0,
        COMMENT: "Pocket money-90",
      },
      {
        "UNIQUE/HR NO.": "238518",
        "STUDENT NAME": "AVI NAVNITBHAI THUMMAR",
        "GR NO.": "2960",
        CLASS: "12 COMMERCE-A",
        TYPE: "CREDIT",
        MODE: "Cash",
        DATE: "21/09/2026",
        AMOUNT: 20.0,
        COMMENT: "Harijayanti",
      },
      {
        "UNIQUE/HR NO.": "251090",
        "STUDENT NAME": "DEVRAJ HITESHBHAI PATEL",
        "GR NO.": "4102",
        CLASS: "10-B",
        TYPE: "DEBIT",
        MODE: "Cash",
        DATE: "21/09/2026",
        AMOUNT: 50.0,
        COMMENT: "Store Stationery",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily_Ledger");
    XLSX.writeFile(wb, "Gurukul_Daily_Ledger_Template.xlsx");
    toast.success("Sample Excel template downloaded successfully!");
  };

  // --------------------------------------------------------------------------
  // 2. Parse Uploaded Excel / CSV File & Generate Preview
  // --------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          toast.error("Excel sheet appears to be empty.");
          setIsProcessing(false);
          return;
        }

        const normalized: DailyLedgerRow[] = [];

        rawRows.forEach((row, idx) => {
          // Flexible key lookup to support variations in user's headers
          const getVal = (candidates: string[]) => {
            for (const c of candidates) {
              for (const k of Object.keys(row)) {
                if (k.trim().toUpperCase() === c.toUpperCase()) {
                  return row[k];
                }
              }
            }
            return "";
          };

          const uniqueNo = String(getVal(["UNIQUE/HR NO.", "UNIQUE NO.", "HR NO.", "VOUCHER NO.", "ID"])).trim();
          const studentName = String(getVal(["STUDENT NAME", "NAME", "STUDENT"])).trim();
          const grNo = String(getVal(["GR NO.", "GR NO", "GRNO", "SUID", "ROLL NO"])).trim();
          const className = String(getVal(["CLASS", "STANDARD", "STD", "CLASS NAME"])).trim();
          const rawType = String(getVal(["TYPE", "TRANSACTION TYPE", "CR/DR"])).trim().toUpperCase();
          const type = rawType.includes("DEBIT") || rawType === "DR" ? "DEBIT" : "CREDIT";
          const mode = String(getVal(["MODE", "PAYMENT MODE", "PAYMENT TYPE"])) || "Cash";
          const date = String(getVal(["DATE", "TXN DATE", "ENTRY DATE"])).trim();
          const rawAmount = parseFloat(String(getVal(["AMOUNT", "AMT", "TOTAL"])).replace(/[^0-9.-]+/g, ""));
          const amount = isNaN(rawAmount) ? 0 : Math.abs(rawAmount);
          const comment = String(getVal(["COMMENT", "REMARKS", "DESCRIPTION", "PARTICULARS", "SERVICE"])).trim();

          if (grNo && amount > 0) {
            normalized.push({
              unique_no: uniqueNo,
              student_name: studentName || `Student (${grNo})`,
              gr_no: grNo,
              class_name: className,
              type,
              mode: mode || "Cash",
              date,
              amount,
              comment,
            });
          }
        });

        if (normalized.length === 0) {
          toast.error("Could not find valid rows with GR NO. and Amount in this file.");
        } else {
          setParsedRows(normalized);
          toast.success(`Parsed ${normalized.length} ledger entries ready for preview!`);
        }
      } catch (err: any) {
        toast.error(`Error parsing Excel file: ${err?.message || "Invalid format"}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // --------------------------------------------------------------------------
  // 3. Confirm & Import into Supabase Database
  // --------------------------------------------------------------------------
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || isImporting) return;

    setIsImporting(true);
    try {
      const res = await importFn({
        data: {
          rows: parsedRows,
          batchNote: `Imported via Excel: ${fileName || "daily_ledger.xlsx"}`,
        },
      });

      setImportResult({
        totalInserted: res.totalInserted,
        newStudentsCreated: res.newStudentsCreated,
      });

      toast.success(
        `Successfully imported ${res.totalInserted} entries! ${
          res.newStudentsCreated > 0 ? `(${res.newStudentsCreated} new student accounts registered)` : ""
        }`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to import ledger entries into Supabase.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --------------------------------------------------------------------------
  // Financial Summary Metrics for Live Preview
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;
    const uniqueStudents = new Set<string>();

    parsedRows.forEach((r) => {
      uniqueStudents.add(r.gr_no.trim());
      if (r.type === "CREDIT") totalCredit += r.amount;
      else totalDebit += r.amount;
    });

    return {
      totalRows: parsedRows.length,
      uniqueStudentsCount: uniqueStudents.size,
      totalCredit,
      totalDebit,
      netBalance: totalCredit - totalDebit,
    };
  }, [parsedRows]);

  // Filtered rows for live preview search
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      const matchesSearch =
        r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.gr_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.unique_no.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === "ALL" || r.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [parsedRows, searchQuery, filterType]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e5d8c5] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#4a1c14] flex items-center gap-3">
            <FileSpreadsheet className="size-8 text-[#8b2500]" /> Daily Ledger Import
          </h1>
          <p className="text-xs sm:text-sm text-[#7c533f] mt-1 font-medium">
            Upload daily school transactions (Pocket Money, Utsav, Deposits) to sync balances with student biometrics.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={downloadSampleTemplate}
          className="rounded-2xl border-[#d8c5af] hover:bg-[#f4ebe0] text-[#6b4a3a] font-bold text-xs gap-2 cursor-pointer shadow-xs"
        >
          <Download className="size-4 text-[#8b2500]" /> Download Sample Excel Template
        </Button>
      </div>

      {/* STEP 1: Upload Card (If no rows parsed yet or completed) */}
      {parsedRows.length === 0 ? (
        <Card className="p-8 sm:p-12 bg-white/90 backdrop-blur-md border-2 border-dashed border-[#d8c5af] hover:border-[#8b2500] rounded-3xl text-center space-y-5 transition-all shadow-sm">
          <div className="mx-auto size-20 rounded-3xl bg-gradient-to-br from-[#8b2500]/10 to-amber-500/10 flex items-center justify-center text-[#8b2500] shadow-inner border border-amber-500/20">
            <Upload className="size-10" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-[#4a1c14] font-sans">
              Select or Drop Daily Excel Report
            </h3>
            <p className="text-xs sm:text-sm text-[#7c533f]">
              Supports <strong>.xlsx, .xls, .csv</strong> files with headers:{" "}
              <code className="bg-[#f5ecdf] px-1.5 py-0.5 rounded text-[11px] text-[#8b2500] font-mono">
                UNIQUE/HR NO., STUDENT NAME, GR NO., CLASS, TYPE, MODE, DATE, AMOUNT, COMMENT
              </code>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-file-input"
            />
            <Button
              size="lg"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl h-12 px-8 bg-[#8b2500] hover:bg-[#a32c00] text-white font-bold text-sm shadow-md cursor-pointer gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Parsing Excel...
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Browse Excel File
                </>
              )}
            </Button>
            <span className="text-[11px] text-[#8b6553]">
              First preview all rows on screen, then confirm to upload into student accounts.
            </span>
          </div>
        </Card>
      ) : (
        /* STEP 2: Interactive Live Preview & Confirmation */
        <div className="space-y-5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="p-4 bg-white border border-[#e5d8c5] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c533f] block">
                Total Rows
              </span>
              <p className="text-2xl font-mono font-black text-[#4a1c14] mt-1">{metrics.totalRows}</p>
              <span className="text-[10px] text-[#8b6553]">{metrics.uniqueStudentsCount} unique GR Numbers</span>
            </Card>

            <Card className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                Total Credit <TrendingUp className="size-3.5 text-emerald-600" />
              </span>
              <p className="text-2xl font-mono font-black text-emerald-700 mt-1">
                ₹{metrics.totalCredit.toFixed(2)}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">To be added to balances</span>
            </Card>

            <Card className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
                Total Debit <TrendingDown className="size-3.5 text-rose-600" />
              </span>
              <p className="text-2xl font-mono font-black text-rose-700 mt-1">
                ₹{metrics.totalDebit.toFixed(2)}
              </p>
              <span className="text-[10px] text-rose-600 font-medium">To be deducted from balances</span>
            </Card>

            <Card className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Net Balance Impact
              </span>
              <p
                className={`text-2xl font-mono font-black mt-1 ${
                  metrics.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                ₹{metrics.netBalance.toFixed(2)}
              </p>
              <span className="text-[10px] text-amber-800 font-medium">Net movement</span>
            </Card>

            {/* Action Card: Confirm or Reset */}
            <Card className="p-3.5 bg-[#4a1c14] text-white rounded-2xl shadow-md flex flex-col justify-between col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-200">File: {fileName?.slice(0, 14)}...</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-white/60 hover:text-white text-[11px] underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <Button
                disabled={isImporting || Boolean(importResult)}
                onClick={handleConfirmImport}
                className="w-full mt-2 h-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#2c140d] font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Importing...
                  </>
                ) : importResult ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-800" /> Done!
                  </>
                ) : (
                  <>
                    <FileCheck className="size-4" /> Confirm & Import
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* Success Banner if already imported */}
          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-300 text-emerald-900 flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Ledger Imported Successfully!</h4>
                  <p className="text-xs text-emerald-800">
                    {importResult.totalInserted} records have been added to the student accounts. When these students
                    tap their finger on the Kiosk scanner, their balances and recent transaction list will show these
                    entries.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleReset}
                className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shrink-0"
              >
                Upload Next File
              </Button>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e5d8c5]">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#7c533f]" />
              <Input
                placeholder="Search Student, GR No, Class, Comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-[#d8c5af] text-xs bg-[#faf6f0]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs font-bold text-[#7c533f] flex items-center gap-1">
                <Filter className="size-3.5" /> Type:
              </span>
              {(["ALL", "CREDIT", "DEBIT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterType === t
                      ? "bg-[#8b2500] text-white shadow-xs"
                      : "bg-[#f4ebe0] text-[#7c533f] hover:bg-[#e5d8c5]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Data Table */}
          <Card className="overflow-hidden bg-white border border-[#e5d8c5] rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7efe5] border-b border-[#e5d8c5] text-[#4a1c14] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Unique/HR No.</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">GR No.</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Comment / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e7db]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#7c533f]">
                        No matching entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#faf5ee] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#6b4a3a]">
                          {row.unique_no || "—"}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#2d140d]">
                          {row.student_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#8b2500]">
                          {row.gr_no}
                        </td>
                        <td className="py-3 px-4 text-[#5c3e30]">
                          {row.class_name || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide ${
                              row.type === "CREDIT"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#5c3e30] flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {row.mode}
                        </td>
                        <td className="py-3 px-4 text-[#6b4a3a] font-mono">
                          {row.date || "Today"}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-black text-sm ${
                            row.type === "CREDIT" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {row.type === "CREDIT" ? "+" : "-"}₹{row.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-[#6b4a3a] max-w-xs truncate" title={row.comment}>
                          {row.comment || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 100 && (
              <div className="p-3 text-center text-xs text-[#7c533f] bg-[#fbf6ee] border-t border-[#e5d8c5]">
                Showing first 100 of {filteredRows.length} records. All {filteredRows.length} records will be imported.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
