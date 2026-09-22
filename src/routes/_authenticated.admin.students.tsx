import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import {
  Download,
  Upload,
  Search,
  Pencil,
  Trash2,
  Fingerprint,
  Loader2,
  X,
  AlertTriangle,
  Plus,
  UserPlus,
  CreditCard,
  Building,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle2,
  Camera,
  Video,
  Eye,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import {
  captureFinger,
  useMantraDevice,
  FINGER_OPTIONS,
  MAX_FINGERS,
  toFingerRecords,
} from "@/lib/mantra";
import {
  extractFaceVector,
  detectHumanFace,
  extractFace512D,
  toBiometricRecords,
  type FaceRecord,
  type FingerRecord,
  type BiometricItem,
} from "@/lib/face";
import {
  deleteStudentServer,
  deleteAllStudentsServer,
  addStudentServer,
  updateStudentServer,
  toggleBlockServer,
  bulkUploadStudentsServer,
} from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students & Biometrics — Gurukul Kiosk ERP" },
      { name: "description", content: "Add, edit, or delete students, and enrol fingerprints on Mantra MFS100." },
    ],
  }),
  component: StudentsPage,
});

const studentSchema = z.object({
  suid: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  class_name: z.string().trim().max(60).optional().or(z.literal("")),
  room_no: z.string().trim().max(60).optional().or(z.literal("")),
});

const emptyForm = { suid: "", name: "", class_name: "", room_no: "" };

function StudentsPage() {
  const qc = useQueryClient();
  const deleteStudentFn = useServerFn(deleteStudentServer);
  const deleteAllStudentsFn = useServerFn(deleteAllStudentsServer);
  const addStudentFn = useServerFn(addStudentServer);
  const updateStudentFn = useServerFn(updateStudentServer);
  const toggleBlockFn = useServerFn(toggleBlockServer);
  const bulkUploadFn = useServerFn(bulkUploadStudentsServer);

  type StudentSortKey = "name" | "suid" | "class" | "room" | "fingers" | "status";

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<StudentSortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterClass, setFilterClass] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "enrolled" | "missing" | "active" | "blocked">("all");
  const [copiedSuid, setCopiedSuid] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newFingers, setNewFingers] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editFingers, setEditFingers] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function copySuid(suid: string) {
    void navigator.clipboard.writeText(suid);
    setCopiedSuid(suid);
    toast.success(`Copied ${suid} to clipboard!`);
    setTimeout(() => setCopiedSuid(null), 2000);
  }

  const students = useQuery({
    queryKey: ["students", search],
    queryFn: async () => {
      let q = supabase.from("students").select("*").order("suid").limit(2000);
      if (search.trim()) q = q.or(`suid.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%,class_name.ilike.%${search.trim()}%,room_no.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const addStudent = useMutation({
    mutationFn: async (values: typeof form) => {
      const parsed = studentSchema.parse(values);
      const safeNfc = parsed.suid;
      try {
        await addStudentFn({
          data: {
            suid: parsed.suid,
            name: parsed.name,
            nfc_no: safeNfc,
            class_name: parsed.class_name || null,
            room_no: parsed.room_no || null,
            fingerprints: newFingers,
          },
        });
      } catch (err) {
        console.warn("Server insert failed, fallback client:", err);
        const { error } = await supabase.from("students").insert({
          suid: parsed.suid,
          name: parsed.name,
          nfc_no: safeNfc,
          class_name: parsed.class_name || null,
          room_no: parsed.room_no || null,
          fingerprints: newFingers,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Student enrolled successfully!");
      setForm(emptyForm);
      setNewFingers([]);
      setShowAddModal(false);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add student"),
  });

  const updateStudent = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const parsed = studentSchema.parse(editForm);
      const safeNfc = parsed.suid;

      // Check if any finger was captured via RDSERVICE instead of CLIENT
      for (const f of editFingers) {
        if (typeof f?.template === "string" && (f.template.includes("<?xml") || f.template.includes("PidData"))) {
          toast.error("❌ Mantra Client Service missing! Please install/run MFS100 Client Service to register fingerprints. RD Service is not allowed here.");
          return;
        }
      }

      try {
        await updateStudentFn({
          data: {
            id: editId,
            data: {
              suid: parsed.suid,
              name: parsed.name,
              nfc_no: safeNfc,
              class_name: parsed.class_name || null,
              room_no: parsed.room_no || null,
              fingerprints: editFingers,
            },
          },
        });
      } catch (err) {
        console.warn("Server update failed, fallback client:", err);
        const { error } = await supabase
          .from("students")
          .update({
            suid: parsed.suid,
            name: parsed.name,
            nfc_no: safeNfc,
            class_name: parsed.class_name || null,
            room_no: parsed.room_no || null,
            fingerprints: editFingers,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Student updated successfully!");
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update student"),
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteStudentFn({ data: { id } });
      } catch (err) {
        console.warn("Server delete failed, fallback client:", err);
        const { error } = await supabase.from("students").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Student removed successfully");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete student"),
  });

  const deleteAllStudents = useMutation({
    mutationFn: async () => {
      try {
        const res = await deleteAllStudentsFn();
        return res;
      } catch (err) {
        console.warn("Server delete-all failed, fallback client:", err);
        const { error } = await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
        return { count: studentList.length };
      }
    },
    onSuccess: (res) => {
      toast.success(`All ${res?.count ?? ""} students deleted successfully`);
      setShowDeleteAllDialog(false);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete all students"),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      try {
        await toggleBlockFn({ data: { id, blocked } });
      } catch (err) {
        console.warn("Server toggle-block failed, fallback client:", err);
        const { error } = await supabase.from("students").update({ blocked }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
    onError: (e: Error) => toast.error(e.message || "Failed to toggle block status"),
  });

  function downloadSample() {
    const ws = XLSX.utils.json_to_sheet([
      { SUID: "GR1001", NAME: "STUDENT NAME 1", CLASS: "10th A", ROOM: "101" },
      { SUID: "GR1002", NAME: "STUDENT NAME 2", CLASS: "10th B", ROOM: "102" },
      { SUID: "GR1003", NAME: "STUDENT NAME 3", CLASS: "11th Science", ROOM: "201" },
      { SUID: "GR1004", NAME: "STUDENT NAME 4", CLASS: "12th Commerce", ROOM: "205" },
    ]);
    ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Gurukul-Students-Sample.xlsx");
    toast.success("Sample Excel downloaded!");
  }

  async function exportStudents() {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("suid");

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("No students found to export");
        return;
      }

      const rows = data.map((s, idx) => ({
        "Sr No": idx + 1,
        "SUID / GR No": s.suid,
        "Student Name": s.name,
        "Class / Std": s.class_name || "-",
        "Room No": s.room_no || "-",
        "Enrolled Fingers": Array.isArray(s.fingerprints) ? s.fingerprints.length : 0,
        "Account Status": s.blocked ? "BLOCKED" : "ACTIVE",
        "Created At": s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN") : "-",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 16 },
        { wch: 32 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Gurukul-Students-Export-${dateStr}.xlsx`);
      toast.success(`Exported ${data.length} students to Excel successfully!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export students");
    }
  }

  async function handleUpload(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Excel file has no sheets");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: "" });
      if (rows.length === 0) throw new Error("Excel file is empty");

      function getVal(r: Record<string, unknown>, aliases: string[]): string {
        const cleanAliases = aliases.map((a) => a.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
        // Pass 1: exact match on cleaned alphanumeric key
        for (const cleanA of cleanAliases) {
          for (const k of Object.keys(r)) {
            const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanK === cleanA) {
              const val = r[k];
              if (val !== undefined && val !== null) {
                const s = String(val).trim();
                if (s !== "" && s !== "-") return s;
              }
            }
          }
        }
        // Pass 2: substring match (for long or combined column headers like "Class / Std", "Room Number")
        for (const cleanA of cleanAliases) {
          if (cleanA.length < 3) continue;
          for (const k of Object.keys(r)) {
            const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanK.includes(cleanA) || cleanA.includes(cleanK)) {
              const val = r[k];
              if (val !== undefined && val !== null) {
                const s = String(val).trim();
                if (s !== "" && s !== "-") return s;
              }
            }
          }
        }
        return "";
      }

      const payload = rows
        .map((r, index) => {
          const suid =
            getVal(r, ["suid", "grno", "gr_no", "gr", "rollno", "roll_no", "id", "enrollment", "student_id", "suidgrno", "admissionno"]) ||
            `SUID${String(index + 1).padStart(3, "0")}`;
          const name = getVal(r, ["name", "student_name", "fullname", "student", "studentname", "full_name"]) || `Student ${suid}`;
          const nfc_no = suid;
          const class_name =
            getVal(r, [
              "class",
              "class_name",
              "classname",
              "std",
              "standard",
              "grade",
              "classstd",
              "stdclass",
              "dhoran",
              "section",
              "division",
              "stddiv",
            ]) || null;
          const room_no =
            getVal(r, [
              "room",
              "room_no",
              "roomno",
              "hostel_room",
              "room_number",
              "roomnumber",
              "hostel",
              "hostelroom",
              "roombed",
              "bed",
              "bed_no",
            ]) || null;

          return { suid, name, nfc_no, class_name, room_no };
        })
        .filter((p) => p.suid.length > 0 && p.name.length > 0);

      if (payload.length === 0) throw new Error("No valid student rows found in file");

      try {
        const res = await bulkUploadFn({ data: payload });
        toast.success(`${res.count} students imported successfully`);
      } catch (err) {
        console.warn("Server bulk upload failed, fallback client:", err);
        // Fallback: upsert directly via Supabase client, preserving biometrics
        for (const p of payload) {
          const { error } = await supabase.from("students").upsert(
            {
              suid: p.suid,
              name: p.name,
              nfc_no: p.nfc_no,
              class_name: p.class_name,
              room_no: p.room_no,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "suid" },
          );
          if (error) console.error("Client upsert error for", p.suid, error);
        }
        toast.success(`${payload.length} students imported successfully`);
      }
      qc.invalidateQueries({ queryKey: ["students"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openEdit(s: {
    id: string;
    suid: string;
    name: string;
    class_name: string | null;
    room_no: string | null;
    fingerprints: unknown;
  }) {
    setEditId(s.id);
    setEditForm({
      suid: s.suid,
      name: s.name,
      class_name: s.class_name ?? "",
      room_no: s.room_no ?? "",
    });
    setEditFingers(toBiometricRecords(s.fingerprints));
  }

  const studentList = students.data ?? [];

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of studentList) {
      if (s.class_name && s.class_name.trim()) set.add(s.class_name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [studentList]);

  const totalCount = studentList.length;
  const enrolledCount = useMemo(() => {
    return studentList.filter((s) => {
      const biometrics = toBiometricRecords(s.fingerprints);
      return biometrics.filter((b) => b.type !== "face").length > 0;
    }).length;
  }, [studentList]);
  const missingCount = Math.max(0, totalCount - enrolledCount);
  const activeCount = useMemo(() => studentList.filter((s) => !s.blocked).length, [studentList]);
  const blockedCount = Math.max(0, totalCount - activeCount);

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = studentList.filter((s) => {
      // Tab filter
      if (activeTab === "enrolled") {
        const biometrics = toBiometricRecords(s.fingerprints);
        if (biometrics.filter((b) => b.type !== "face").length === 0) return false;
      } else if (activeTab === "missing") {
        const biometrics = toBiometricRecords(s.fingerprints);
        if (biometrics.filter((b) => b.type !== "face").length > 0) return false;
      } else if (activeTab === "active" && s.blocked) {
        return false;
      } else if (activeTab === "blocked" && !s.blocked) {
        return false;
      }

      if (filterClass !== "all" && (s.class_name || "").trim() !== filterClass) return false;

      return true;
    });

    const dir = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }) * dir;
        case "suid":
          return (a.suid || "").localeCompare(b.suid || "", undefined, { numeric: true }) * dir;
        case "class":
          return (a.class_name || "").localeCompare(b.class_name || "", undefined, { numeric: true }) * dir;
        case "room":
          return (a.room_no || "").localeCompare(b.room_no || "", undefined, { numeric: true }) * dir;
        case "fingers": {
          const countA = Array.isArray(a.fingerprints) ? a.fingerprints.length : 0;
          const countB = Array.isArray(b.fingerprints) ? b.fingerprints.length : 0;
          return (countA - countB) * dir;
        }
        case "status": {
          const valA = a.blocked ? 1 : 0;
          const valB = b.blocked ? 1 : 0;
          return (valA - valB) * dir;
        }
        default:
          return 0;
      }
    });
  }, [studentList, activeTab, filterClass, sortKey, sortAsc]);

  function resetDirectoryFilters() {
    setSearch("");
    setActiveTab("all");
    setFilterClass("all");
    setSortKey("name");
    setSortAsc(true);
  }

  function renderHeader(label: string, key: StudentSortKey) {
    const isActive = sortKey === key;
    return (
      <th className="py-3.5 pr-4">
        <button
          type="button"
          onClick={() => {
            if (sortKey === key) {
              setSortAsc(!sortAsc);
            } else {
              setSortKey(key);
              setSortAsc(true);
            }
          }}
          className={`group inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer select-none ${
            isActive ? "text-[#8b2500]" : "text-[#7c533f] hover:text-[#4a1c14]"
          }`}
          title={`Click to sort by ${label} (${isActive ? (sortAsc ? "A to Z / Ascending" : "Z to A / Descending") : "Click to sort"})`}
        >
          <span>{label}</span>
          {isActive ? (
            sortAsc ? (
              <ArrowUp className="size-3.5 text-[#8b2500]" />
            ) : (
              <ArrowDown className="size-3.5 text-[#8b2500]" />
            )
          ) : (
            <ArrowUpDown className="size-3.5 text-[#7c533f]/40 group-hover:text-[#7c533f]" />
          )}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300">
      {/* Page Header with Primary Action & Utility Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 text-[#8b2500] text-xs font-bold tracking-wider uppercase mb-1.5 border border-amber-200">
            <Sparkles className="size-3 text-amber-700 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Biometric Master Register</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-black text-[#4a1c14] tracking-tight flex items-center gap-3">
            <Users className="size-9 text-[#8b2500]" /> Students & Biometrics
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            Manage student records, live Mantra MFS100 optical fingerprint enrolment, and kiosk access permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-luxury-primary px-5 py-2.5 text-xs font-bold gap-2 shadow-lg shadow-[#8b2500]/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <UserPlus className="size-4" /> Enrol New Student
          </button>

          <button
            type="button"
            onClick={downloadSample}
            className="btn-luxury-secondary px-4 py-2.5 text-xs gap-2 cursor-pointer transition-transform hover:scale-102"
          >
            <Download className="size-4 text-[#8b2500]" /> Sample Excel
          </button>

          <button
            type="button"
            onClick={exportStudents}
            disabled={studentList.length === 0}
            className="btn-luxury-secondary px-4 py-2.5 text-xs gap-2 text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-xs cursor-pointer transition-transform hover:scale-102"
          >
            <Download className="size-4 text-emerald-600" /> Export Excel ({studentList.length})
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-luxury-secondary px-4 py-2.5 text-xs gap-2 text-[#4a1c14] border-[#d8c5af] hover:bg-[#faf4eb] cursor-pointer transition-transform hover:scale-102"
          >
            <Upload className="size-4 text-[#8b2500]" /> Bulk Upload (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={deleteAllStudents.isPending || studentList.length === 0}
            className="btn-luxury-danger px-4 py-2.5 text-xs gap-2 disabled:opacity-50 cursor-pointer transition-transform hover:scale-102"
          >
            <Trash2 className="size-4" /> Delete All ({studentList.length})
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
        </div>
      </header>

      {/* TOP KPI CARDS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="card-luxury p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Total Students</span>
            <div className="text-3xl font-black font-sans text-[#4a1c14]">{totalCount}</div>
            <p className="text-[11px] text-[#7c533f]">Registered in Gurukul ERP</p>
          </div>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#8b2500] to-amber-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
            <Users className="size-6" />
          </div>
        </div>

        {/* Biometrics Complete */}
        <div className="card-luxury p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Biometrics Complete</span>
            <div className="text-3xl font-black font-sans text-emerald-800">{enrolledCount}</div>
            <p className="text-[11px] text-emerald-700 font-semibold">
              {totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0}% MFS100 enrolled
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shadow-md group-hover:scale-110 transition-transform">
            <Fingerprint className="size-6 text-emerald-700" />
          </div>
        </div>

        {/* Missing Biometrics */}
        <div
          onClick={() => setActiveTab(activeTab === "missing" ? "all" : "missing")}
          className={`card-luxury p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${
            activeTab === "missing" ? "ring-2 ring-amber-600 bg-amber-50/50" : ""
          }`}
          title="Click to view students without fingerprints"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
              <span>Missing Biometrics</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 font-semibold">
                Filter
              </span>
            </div>
            <div className="text-3xl font-black font-sans text-amber-900">{missingCount}</div>
            <p className="text-[11px] text-amber-800">Pending finger enrolment</p>
          </div>
          <div className="size-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shadow-md group-hover:scale-110 transition-transform">
            <AlertTriangle className="size-6 text-amber-700" />
          </div>
        </div>

        {/* Account Status */}
        <div className="card-luxury p-5 flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7c533f]">Active Accounts</span>
            <div className="text-3xl font-black font-sans text-teal-900">{activeCount}</div>
            <p className="text-[11px] text-[#7c533f]">
              {blockedCount > 0 ? (
                <span className="text-rose-700 font-bold">{blockedCount} Blocked</span>
              ) : (
                <span className="text-emerald-700 font-bold">100% Kiosk Authorized</span>
              )}
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shadow-md group-hover:scale-110 transition-transform">
            <ShieldCheck className="size-6 text-teal-700" />
          </div>
        </div>
      </div>

      {/* STUDENTS DIRECTORY TABLE CARD */}
      <Card className="card-luxury p-5 sm:p-7 space-y-5">
        {/* Quick Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d8c5] pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Students", count: totalCount },
              { id: "enrolled", label: "Biometric Enrolled", count: enrolledCount },
              { id: "missing", label: "Missing Biometrics", count: missingCount },
              { id: "active", label: "Active", count: activeCount },
              { id: "blocked", label: "Blocked", count: blockedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#8b2500] text-white shadow-md shadow-[#8b2500]/20"
                    : "bg-[#faf6ef] text-[#7c533f] hover:bg-[#f3e9dc] border border-[#d8c5af]/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? "bg-white/25 text-white" : "bg-black/5 text-[#4a1c14]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7c533f]">
              Showing <strong className="text-[#8b2500] font-mono">{filteredAndSortedStudents.length}</strong> of {totalCount}
            </span>
          </div>
        </div>

        {/* Query & Filter Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end bg-[#faf6ef]/70 p-3.5 rounded-2xl border border-[#e5d8c5]">
          {/* Search Box */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="search-students" className="text-[11px] font-bold text-[#7c533f]">Search Student</Label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-3 text-[#7c533f]/50" />
              <Input
                id="search-students"
                placeholder="Search by SUID, Name, Class, or Room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-luxury pl-9 pr-8 h-10 text-xs w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-[#7c533f]/60 hover:text-[#4a1c14] cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Class Filter */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-[#7c533f]">Filter by Class</Label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="input-luxury h-10 text-xs font-semibold">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes ({uniqueClasses.length})</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Key Selector */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-[#7c533f]">Sort Order</Label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (sortKey === "name") {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortKey("name");
                    setSortAsc(true);
                  }
                }}
                className={`flex-1 h-10 inline-flex items-center justify-center gap-1 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  sortKey === "name"
                    ? "bg-[#8b2500] text-white border-[#8b2500] shadow-xs"
                    : "bg-white text-[#7c533f] border-[#d8c5af] hover:bg-[#faf4eb]"
                }`}
              >
                {sortAsc ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                <span>Name ({sortAsc ? "A→Z" : "Z→A"})</span>
              </button>
            </div>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              onClick={resetDirectoryFilters}
              className="btn-luxury-secondary h-10 px-4 text-xs gap-1.5 w-full justify-center cursor-pointer"
              title="Reset all filters and sort to Name A-Z"
            >
              <RotateCcw className="size-3.5" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Directory Table with Clickable Sort Headers & Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[720px] rounded-2xl border border-[#e5d8c5] scroll-smooth custom-scrollbar shadow-inner bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#faf6ef] z-10 shadow-xs border-b border-[#e5d8c5]">
              <tr className="text-left text-xs uppercase tracking-wider font-bold">
                {renderHeader("SUID / GR", "suid")}
                {renderHeader("Student Name", "name")}
                {renderHeader("Class", "class")}
                {renderHeader("Room", "room")}
                {renderHeader("Biometrics (MFS100)", "fingers")}
                {renderHeader("Kiosk Access", "status")}
                <th className="py-3.5 pr-4 text-right text-xs uppercase tracking-wider text-[#7c533f] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5d8c5]/60 text-xs font-mono">
              {filteredAndSortedStudents.map((s) => {
                const biometrics = toBiometricRecords(s.fingerprints);
                const fingerList = biometrics.filter((b) => b.type !== "face") as FingerRecord[];
                const fingerCount = fingerList.length;

                return (
                  <tr key={s.id} className="table-row-luxury hover:bg-[#faf4eb] transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-[#8b2500]">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#faf6ef] border border-[#d8c5af] group/suid">
                        <span className="font-mono text-xs font-bold text-[#8b2500]">{s.suid}</span>
                        <button
                          type="button"
                          onClick={() => copySuid(s.suid)}
                          className="text-[#7c533f]/60 hover:text-[#8b2500] transition-colors cursor-pointer"
                          title="Copy SUID"
                        >
                          {copiedSuid === s.suid ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3 opacity-60 group-hover/suid:opacity-100" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-sans font-bold text-sm text-[#2c1810]">
                      <div className="flex items-center gap-2.5">
                        <span className="size-8 rounded-full bg-gradient-to-tr from-[#8b2500] to-amber-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-zinc-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-sans text-[#4a1c14]">
                      {s.class_name ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                          {s.class_name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 font-sans font-medium text-[#7c533f]">
                      {s.room_no ? (
                        <span className="px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af] font-mono font-bold text-[#4a1c14]">
                          {s.room_no}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {fingerCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                          <Fingerprint className="size-3.5 text-emerald-600" />
                          <span>{fingerCount} {fingerCount === 1 ? "Finger" : "Fingers"}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
                          title="Click to enrol fingerprint now"
                        >
                          <Plus className="size-3 text-amber-700" />
                          <span>Enrol Finger</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!s.blocked}
                          onCheckedChange={(active) => toggleBlock.mutate({ id: s.id, blocked: !active })}
                        />
                        <span className={`text-[10px] font-sans font-extrabold px-2.5 py-0.5 rounded-full border shadow-xs ${
                          !s.blocked
                            ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-900 border-rose-500/40"
                        }`}>
                          {!s.blocked ? "ACTIVE" : "BLOCKED"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-[#7c533f] hover:text-[#8b2500] hover:bg-[#faf4eb] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          title="Edit Student Profile & Biometrics"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 rounded-lg text-[#7c533f] hover:text-rose-600 hover:bg-rose-50 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-sans text-[#7c533f]">
                    {studentList.length === 0 ? (
                      <div className="space-y-3">
                        <p className="font-semibold text-base text-[#4a1c14]">No student records in database yet</p>
                        <button
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="btn-luxury-primary px-5 py-2 text-xs font-bold gap-2 cursor-pointer"
                        >
                          <UserPlus className="size-4" /> Enrol First Student
                        </button>
                      </div>
                    ) : (
                      "No students match the current filters. Click 'Reset Filters' to view all."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD STUDENT DIALOG MODAL */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="modal-luxury max-w-2xl bg-[#fdfbf7] border-2 border-[#e5d8c5] rounded-3xl shadow-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#4a1c14] flex items-center gap-2.5">
              <UserPlus className="size-6 text-[#8b2500]" /> Enrol New Student
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Register new student profile with SUID and live Mantra MFS100 optical fingerprints.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addStudent.mutate(form);
            }}
            className="space-y-5 pt-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="modal-suid" className="text-xs font-bold text-[#7c533f]">SUID / GR No *</Label>
                <Input
                  id="modal-suid"
                  required
                  placeholder="e.g. GR1001 or 202401"
                  value={form.suid}
                  onChange={(e) => setForm({ ...form, suid: e.target.value })}
                  className="input-luxury h-11 px-3.5 font-mono text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-name" className="text-xs font-bold text-[#7c533f]">Student Full Name *</Label>
                <Input
                  id="modal-name"
                  required
                  placeholder="Enter Full Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-luxury h-11 px-3.5 text-sm font-semibold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-class" className="text-xs font-bold text-[#7c533f]">Class / Standard</Label>
                <Input
                  id="modal-class"
                  placeholder="e.g. 10th A, 12th Commerce"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  className="input-luxury h-11 px-3.5 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-room" className="text-xs font-bold text-[#7c533f]">Room No / Hostel</Label>
                <Input
                  id="modal-room"
                  placeholder="e.g. 101, B-205"
                  value={form.room_no}
                  onChange={(e) => setForm({ ...form, room_no: e.target.value })}
                  className="input-luxury h-11 px-3.5 text-sm font-mono font-semibold"
                />
              </div>
            </div>

            {/* Unified Mantra Fingerprint Enroller */}
            <BiometricEnroller
              records={newFingers}
              onChange={setNewFingers}
              suid={form.suid}
            />

            <DialogFooter className="gap-2.5 pt-4 border-t border-[#e5d8c5]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-luxury-secondary px-5 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addStudent.isPending}
                className="btn-luxury-primary px-7 py-2.5 text-xs font-bold gap-2 shadow-md cursor-pointer"
              >
                {addStudent.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Save & Enrol Student
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT STUDENT DIALOG */}
      <Dialog open={Boolean(editId)} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="modal-luxury max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#4a1c14] flex items-center gap-2">
              <Pencil className="size-5 text-[#8b2500]" /> Edit Student & Biometrics
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7c533f]">
              Update SUID, name, class, room number, and enrolled fingerprints.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateStudent.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-suid" className="text-xs font-bold text-[#7c533f]">SUID *</Label>
                <Input
                  id="edit-suid"
                  required
                  value={editForm.suid}
                  onChange={(e) => setEditForm({ ...editForm, suid: e.target.value })}
                  className="input-luxury h-10 font-mono text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-bold text-[#7c533f]">Student Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-luxury h-10 text-sm font-semibold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-class" className="text-xs font-bold text-[#7c533f]">Class / Std</Label>
                <Input
                  id="edit-class"
                  placeholder="Enter Class / Standard"
                  value={editForm.class_name}
                  onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                  className="input-luxury h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-room" className="text-xs font-bold text-[#7c533f]">Room No / Hostel</Label>
                <Input
                  id="edit-room"
                  placeholder="Enter Room No (e.g. 101, B-12)"
                  value={editForm.room_no}
                  onChange={(e) => setEditForm({ ...editForm, room_no: e.target.value })}
                  className="input-luxury h-10 text-sm font-mono font-semibold"
                />
              </div>
            </div>

            <BiometricEnroller
              records={editFingers}
              onChange={setEditFingers}
              suid={editForm.suid}
            />

            <DialogFooter className="gap-2 pt-4 border-t border-[#e5d8c5]">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="btn-luxury-secondary px-5 py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateStudent.isPending}
                className="btn-luxury-primary px-6 py-2.5 text-xs gap-2"
              >
                {updateStudent.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SINGLE STUDENT DELETE CONFIRMATION */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-serif font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Student Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#7c533f]">
              The student profile and enrolled biometrics will be permanently removed from the active database. Past transaction logs are preserved in reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="btn-luxury-secondary px-4 py-2 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-luxury-danger px-4 py-2 text-xs"
              onClick={() => deleteId && deleteStudent.mutate(deleteId)}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE ALL STUDENTS CONFIRMATION */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="modal-luxury max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-rose-700 flex items-center gap-2">
              <AlertTriangle className="size-6 text-rose-600" /> DANGER: Delete ALL Students?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#7c533f]">
              This will permanently delete all {studentList.length} student profiles and all enrolled biometrics from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4 border-t border-[#e5d8c5]">
            <AlertDialogCancel className="btn-luxury-secondary px-4 py-2 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-luxury-danger px-4 py-2 text-xs"
              onClick={() => deleteAllStudents.mutate()}
            >
              Yes, Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BiometricEnroller({
  records,
  onChange,
  suid,
}: {
  records: any[];
  onChange: (records: any[]) => void;
  suid?: string;
}) {
  const [scanningFinger, setScanningFinger] = useState(false);
  const { device, isConnected } = useMantraDevice(3000);

  const fingers = records.filter((r) => r.type !== "face") as FingerRecord[];
  const fullFingers = fingers.length >= MAX_FINGERS;

  // Mantra Fingerprint Scan
  async function handleStartScan() {
    if (!isConnected) {
      toast.error("Mantra scanner is not connected. Please connect USB cable.");
      return;
    }
    if (fullFingers) {
      toast.error(`Maximum limit of ${MAX_FINGERS} fingerprints reached.`);
      return;
    }
    setScanningFinger(true);
    try {
      const res = await captureFinger(60, 10);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const templateData = res.template || "";
      if (fingers.some((f) => f.template === templateData)) {
        toast.error("This fingerprint is already enrolled for this student.");
        return;
      }
      const fingerLabel = `Finger ${fingers.length + 1}`;
      const newFingerRecord: FingerRecord = {
        finger: fingerLabel,
        template: res.template,
        quality: res.quality,
        serial: res.serial,
        enrolled_at: new Date().toISOString(),
      };

      onChange([...fingers, newFingerRecord]);
      toast.success(`${fingerLabel} captured successfully (Quality: ${res.quality}%)`);
    } finally {
      setScanningFinger(false);
    }
  }

  return (
    <div className="rounded-2xl border-1.5 border-[#e5d8c5] bg-[#faf6ef] p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e5d8c5] pb-2.5">
        <div className="flex items-center gap-2 font-bold text-xs text-[#4a1c14]">
          <Fingerprint className="size-4 text-[#8b2500]" />
          <span>Mantra Fingerprints ({fingers.length}/{MAX_FINGERS})</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 font-bold text-emerald-800 text-[11px]">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mantra {device?.model ?? "MFS100"} Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 font-bold text-rose-800 text-[11px]">
              Scanner Offline
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {fingers.map((f, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-[#8b2500] shadow-sm"
            >
              <Fingerprint className="size-4 text-[#8b2500] shrink-0" />
              <span>{f.finger || `Finger ${idx + 1}`}</span>
              {f.quality > 0 && <span className="text-[10px] opacity-75 font-mono">Q:{f.quality}%</span>}
              <button
                type="button"
                aria-label={`Remove ${f.finger}`}
                onClick={() => onChange(fingers.filter((r) => r !== f))}
                className="ml-1 text-[#8b2500]/60 transition-colors hover:text-rose-600 hover:scale-125"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}

          {!fullFingers && (
            <button
              type="button"
              onClick={handleStartScan}
              disabled={scanningFinger || !isConnected}
              className="btn-luxury-primary px-4 py-2 text-xs gap-2 shadow-sm cursor-pointer"
            >
              {scanningFinger ? (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-300" />
                  <span>Place Finger on Mantra Scanner...</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <Fingerprint className="size-4" />
                  <span>Add Finger ({fingers.length}/{MAX_FINGERS})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
