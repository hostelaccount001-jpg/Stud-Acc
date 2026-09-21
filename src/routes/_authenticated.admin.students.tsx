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
      { name: "description", content: "Add, edit, or delete students, and enrol fingerprints on Mantra MFS100 / MFS110." },
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
  const [filterFinger, setFilterFinger] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState(emptyForm);
  const [newFingers, setNewFingers] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editFingers, setEditFingers] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      { SUID: "GR1001", NAME: "STUDENT NAME 1", CLASS: "Class 10", ROOM: "101" },
      { SUID: "GR1002", NAME: "STUDENT NAME 2", CLASS: "Class 10", ROOM: "102" },
    ]);
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!);
      if (rows.length === 0) throw new Error("Excel file is empty");

      function getVal(r: Record<string, unknown>, aliases: string[]): string {
        for (const a of aliases) {
          for (const k of Object.keys(r)) {
            const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const cleanA = a.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanK === cleanA) {
              const val = r[k];
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                return String(val).trim();
              }
            }
          }
        }
        return "";
      }

      const payload = rows
        .map((r, index) => {
          const suid =
            getVal(r, ["suid", "grno", "gr_no", "gr", "rollno", "roll_no", "id", "enrollment", "student_id"]) ||
            `SUID${String(index + 1).padStart(3, "0")}`;
          const name = getVal(r, ["name", "student_name", "fullname", "student"]) || `Student ${suid}`;
          const nfc_no = suid;
          const class_name = getVal(r, ["class_name", "classname", "class", "std", "standard", "grade"]) || null;
          const room_no = getVal(r, ["room_no", "roomno", "room", "hostel_room", "room_number"]) || null;

          return { suid, name, nfc_no, class_name, room_no };
        })
        .filter((p) => p.suid.length > 0 && p.name.length > 0);

      if (payload.length === 0) throw new Error("No valid student rows found in file");

      try {
        const res = await bulkUploadFn({ data: payload });
        toast.success(`${res.count} students imported successfully`);
      } catch (err) {
        console.warn("Server bulk upload failed, fallback client:", err);
        const { error } = await supabase.from("students").upsert(
          payload.map((p) => ({
            suid: p.suid,
            name: p.name,
            nfc_no: p.nfc_no,
            class_name: p.class_name,
            room_no: p.room_no,
          })),
          { onConflict: "suid" },
        );
        if (error) throw error;
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

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = studentList.filter((s) => {
      if (filterClass !== "all" && (s.class_name || "").trim() !== filterClass) return false;
      if (filterStatus === "active" && s.blocked) return false;
      if (filterStatus === "blocked" && !s.blocked) return false;

      const biometrics = toBiometricRecords(s.fingerprints);
      const fingerList = biometrics.filter((b) => b.type !== "face");
      const hasFingers = fingerList.length > 0;
      if (filterFinger === "enrolled" && !hasFingers) return false;
      if (filterFinger === "missing" && hasFingers) return false;

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
  }, [studentList, filterClass, filterFinger, filterStatus, sortKey, sortAsc]);

  function resetDirectoryFilters() {
    setSearch("");
    setFilterClass("all");
    setFilterFinger("all");
    setFilterStatus("all");
    setSortKey("name");
    setSortAsc(true);
  }

  function renderHeader(label: string, key: StudentSortKey) {
    const isActive = sortKey === key;
    return (
      <th className="py-3 pr-4">
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
    <div className="space-y-8 animate-in fade-in zoom-in-98 duration-300">
      {/* Page Header with Animated Luxury Action Buttons */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5">
            <Users className="size-8 text-[#8b2500]" /> Students & Biometrics
          </h1>
          <p className="mt-1 text-sm text-[#7c533f] font-medium">
            SUID and biometric enrollment, up to {MAX_FINGERS} fingerprints on Mantra MFS100 / MFS110, plus temporary account blocking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadSample}
            className="btn-luxury-secondary px-4 py-2.5 text-xs gap-2"
          >
            <Download className="size-4 text-[#8b2500]" /> Sample Excel
          </button>

          <button
            type="button"
            onClick={exportStudents}
            disabled={studentList.length === 0}
            className="btn-luxury-secondary px-4 py-2.5 text-xs gap-2 text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-sm"
          >
            <Download className="size-4 text-emerald-600" /> Export Excel ({studentList.length})
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-luxury-primary px-4 py-2.5 text-xs gap-2"
          >
            <Upload className="size-4" /> Bulk Upload (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={deleteAllStudents.isPending || studentList.length === 0}
            className="btn-luxury-danger px-4 py-2.5 text-xs gap-2 disabled:opacity-50"
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

      {/* ADD STUDENT LUXURY FORM CARD */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#e5d8c5] pb-4">
          <div className="size-9 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 flex items-center justify-center text-white shadow-md">
            <UserPlus className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#4a1c14]">Add New Student Record</h2>
            <p className="text-xs text-[#7c533f]">Register student profile with SUID and live Mantra biometrics</p>
          </div>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            addStudent.mutate(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="suid" className="text-xs font-bold text-[#7c533f]">SUID / GR No *</Label>
              <Input
                id="suid"
                required
                placeholder="Enter SUID / GR No"
                value={form.suid}
                onChange={(e) => setForm({ ...form, suid: e.target.value })}
                className="input-luxury h-10 px-3 font-mono text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-[#7c533f]">Full Student Name *</Label>
              <Input
                id="name"
                required
                placeholder="Enter Full Student Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-luxury h-10 px-3 text-sm font-semibold uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="class_name" className="text-xs font-bold text-[#7c533f]">Class / Std</Label>
              <Input
                id="class_name"
                placeholder="Enter Class / Standard"
                value={form.class_name}
                onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                className="input-luxury h-10 px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room_no" className="text-xs font-bold text-[#7c533f]">Room No / Hostel</Label>
              <Input
                id="room_no"
                placeholder="Enter Room No (e.g. 101, B-12)"
                value={form.room_no}
                onChange={(e) => setForm({ ...form, room_no: e.target.value })}
                className="input-luxury h-10 px-3 text-sm font-mono font-semibold"
              />
            </div>
          </div>

          {/* Unified Mantra Fingerprint Enroller */}
          <BiometricEnroller
            records={newFingers}
            onChange={setNewFingers}
            suid={form.suid}
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={addStudent.isPending}
              className="btn-luxury-primary px-8 py-3 text-sm gap-2"
            >
              {addStudent.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4" />}
              Save & Enrol Student
            </button>
          </div>
        </form>
      </Card>

      {/* STUDENTS DIRECTORY TABLE CARD */}
      <Card className="card-luxury p-6 md:p-8 space-y-6">
        {/* Header & Quick Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#4a1c14] flex items-center gap-2">
              <Users className="size-5 text-[#8b2500]" /> Student Directory & Enrollment Ledger
            </h2>
            <p className="text-xs text-[#7c533f] mt-0.5">
              Click any column header to sort (A → Z Name, SUID, Class, Room, Biometrics).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick One-Click A to Z / Z to A Toggle Button */}
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                sortKey === "name"
                  ? "bg-[#8b2500] text-white shadow-amber-900/20"
                  : "bg-[#faf6ef] text-[#4a1c14] border border-[#d8c5af] hover:bg-[#8b2500] hover:text-white"
              }`}
              title="Click to toggle Name A to Z / Z to A sort"
            >
              {sortKey === "name" && !sortAsc ? (
                <>
                  <ArrowDownAZ className="size-4" />
                  <span>Name: Z → A</span>
                </>
              ) : (
                <>
                  <ArrowUpAZ className="size-4" />
                  <span>Name: A → Z</span>
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#faf6ef] text-[#4a1c14] border border-[#d8c5af]">
              Showing: <strong className="font-mono text-[#8b2500]">{filteredAndSortedStudents.length}</strong> of {studentList.length}
            </span>
          </div>
        </div>

        {/* Query & Filter Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end bg-[#faf6ef]/70 p-4 rounded-2xl border border-[#e5d8c5]">
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
                className="input-luxury pl-9 h-10 text-xs w-full"
              />
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

          {/* Biometrics Filter */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-[#7c533f]">Biometrics Status</Label>
            <Select value={filterFinger} onValueChange={setFilterFinger}>
              <SelectTrigger className="input-luxury h-10 text-xs font-semibold">
                <SelectValue placeholder="All Biometrics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Biometrics</SelectItem>
                <SelectItem value="enrolled">Enrolled Only (Fingers Added)</SelectItem>
                <SelectItem value="missing">Missing Fingerprints</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              onClick={resetDirectoryFilters}
              className="btn-luxury-secondary h-10 px-4 text-xs gap-1.5 w-full justify-center"
              title="Reset all filters and sort to Name A-Z"
            >
              <RotateCcw className="size-3.5" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Directory Table with Clickable Sort Headers */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider font-bold">
                {renderHeader("SUID", "suid")}
                {renderHeader("Student", "name")}
                {renderHeader("Class", "class")}
                {renderHeader("Room No", "room")}
                {renderHeader("Fingerprints", "fingers")}
                {renderHeader("Status", "status")}
                <th className="py-3 pr-4 text-right text-xs uppercase tracking-wider text-[#7c533f] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5d8c5]/60 text-xs font-mono">
              {filteredAndSortedStudents.map((s) => {
                const biometrics = toBiometricRecords(s.fingerprints);
                const faceRec = biometrics.find((b) => b.type === "face") as FaceRecord | undefined;
                const fingerList = biometrics.filter((b) => b.type !== "face") as FingerRecord[];
                const fingerCount = fingerList.length;

                return (
                  <tr key={s.id} className="table-row-luxury hover:bg-[#faf4eb]">
                    <td className="py-3.5 pr-4 font-bold text-[#8b2500]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af]">
                        {s.suid}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-sans font-bold text-sm text-[#2c1810]">
                      <div className="flex items-center gap-2.5">
                        <span className="size-8 rounded-full bg-[#e5d8c5] flex items-center justify-center text-[#7c533f] font-bold shrink-0">
                          {s.name.charAt(0)}
                        </span>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-sans text-[#4a1c14]">
                      {s.class_name ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 font-sans font-medium text-[#7c533f]">
                      {s.room_no ? (
                        <span className="px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af] font-mono font-bold text-[#4a1c14]">
                          {s.room_no}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {fingerCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                          <Fingerprint className="size-3.5" /> {fingerCount} Fingers
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">No Fingerprint</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!s.blocked}
                          onCheckedChange={(active) => toggleBlock.mutate({ id: s.id, blocked: !active })}
                        />
                        <span className={`text-[10px] font-sans font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
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
                          className="p-1.5 rounded-lg text-[#7c533f] hover:text-[#8b2500] hover:bg-[#faf4eb] transition-colors cursor-pointer"
                          title="Edit Student Profile & Biometrics"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 rounded-lg text-[#7c533f] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                  <td colSpan={8} className="py-12 text-center text-sm font-sans text-[#7c533f]">
                    {studentList.length === 0
                      ? "No student records found. Add a student above or import an Excel file."
                      : "No students match the current filters. Click 'Reset Filters' to view all."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
