import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const nfcSchema = z.object({
  nfc: z.string().trim().min(1).max(64),
  probeTemplate: z.string().optional(),
});

const identifySchema = z.object({
  probeTemplate: z.string().min(1),
  quality: z.number().optional(),
});

const punchSchema = z.object({
  nfc: z.string().trim().min(1).max(64),
  serviceId: z.string().uuid(),
  customAmount: z.number().positive().max(10000).optional(),
});

export type KioskConfig = {
  services: { id: string; name: string; price: number; print_receipt: boolean }[];
  settings: Record<string, string>;
  enrolledStudents: { id: string; suid: string; name: string; class_name?: string | null; nfc_no: string }[];
};

export type IdentifyResult =
  | { status: "not_found" }
  | {
      status: "identified";
      studentId: string;
      suid: string;
      name: string;
      nfc_no: string;
      class_name?: string | null;
      room_no?: string | null;
    };

export type LookupResult =
  | { status: "not_found" }
  | { status: "blocked"; message: string }
  | { status: "no_fingerprint"; message: string }
  | { status: "fingerprint_mismatch"; message: string }
  | {
      status: "ok";
      studentId: string;
      suid: string;
      name: string;
      nfc_no: string;
      class_name?: string | null;
      room_no?: string | null;
      fingerprintsCount: number;
      templates: string[];
      facePhoto?: string | null;
      faceDescriptor?: number[] | null;
      hasFace: boolean;
      hasFingerprint: boolean;
    };

export type PunchResult =
  | { status: "not_found" }
  | { status: "blocked"; message: string }
  | { status: "limit"; message: string }
  | {
      status: "ok";
      message: string;
      print: boolean;
      receipt: {
        receiptNo: number;
        suid: string;
        name: string;
        className?: string | null;
        roomNo?: string | null;
        service: string;
        amount: number;
        at: string;
      };
    };

const suidSchema = z.object({
  suid: z.string().trim().min(1).max(32),
});

export const getKioskConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<KioskConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: services }, { data: settings }, { data: students }] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, name, price, print_receipt")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin.from("settings").select("key, value"),
      supabaseAdmin
        .from("students")
        .select("id, suid, name, class_name, nfc_no")
        .eq("blocked", false),
    ]);

    return {
      services: (services ?? []).map((s) => ({ ...s, price: Number(s.price) })),
      settings: Object.fromEntries((settings ?? []).map((s) => [s.key, s.value])),
      enrolledStudents: (students ?? []).map((s) => ({
        id: s.id,
        suid: s.suid,
        name: s.name,
        class_name: s.class_name,
        nfc_no: s.nfc_no,
      })),
    };
  },
);

export const lookupStudentBySuid = createServerFn({ method: "POST" })
  .validator((input: unknown) => suidSchema.parse(input))
  .handler(async ({ data }): Promise<LookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, suid, name, nfc_no, class_name, room_no, blocked, fingerprints")
      .eq("suid", data.suid)
      .maybeSingle();

    if (!student) return { status: "not_found" };

    if (student.blocked) {
      const { data: msg } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "msg_blocked")
        .maybeSingle();
      return { status: "blocked", message: msg?.value ?? "Student account is blocked." };
    }

    const fingerRecords = Array.isArray(student.fingerprints) ? student.fingerprints : [];
    const templates: string[] = [];
    let facePhoto: string | null = null;
    let faceDescriptor: number[] | null = null;

    for (const f of fingerRecords as { type?: string; photo?: string; descriptor?: number[]; template?: string }[]) {
      if (f && f.type === "face" && typeof f.photo === "string") {
        facePhoto = f.photo;
        if (Array.isArray(f.descriptor)) faceDescriptor = f.descriptor;
      } else if (f && typeof f.template === "string" && f.template.trim().length > 0) {
        templates.push(f.template.trim());
      }
    }

    const hasFace = Boolean(facePhoto);
    const hasFingerprint = templates.length > 0;

    if (!hasFace && !hasFingerprint) {
      return {
        status: "no_fingerprint",
        message: "No Face or Fingerprint enrolled for this student. Please add biometrics in Admin Portal first.",
      };
    }

    return {
      status: "ok",
      studentId: student.id,
      suid: student.suid,
      name: student.name,
      nfc_no: student.nfc_no,
      class_name: student.class_name,
      room_no: student.room_no,
      fingerprintsCount: templates.length,
      templates,
      facePhoto,
      faceDescriptor,
      hasFace,
      hasFingerprint,
    };
  });

export const getStudentGallery = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id, suid, name, class_name, room_no, nfc_no, fingerprints")
      .eq("blocked", false);

    const enrolled = (students ?? []).filter(
      (s) => Array.isArray(s.fingerprints) && s.fingerprints.length > 0,
    );

    return enrolled.map(s => {
      const templates: string[] = [];
      for (const f of s.fingerprints as { template?: string }[]) {
        if (f.template) templates.push(f.template);
      }
      return {
        id: s.id,
        suid: s.suid,
        name: s.name,
        nfc_no: s.nfc_no,
        class_name: s.class_name,
        room_no: s.room_no,
        templates
      };
    });
  });

export const lookupStudent = createServerFn({ method: "POST" })
  .validator((input: unknown) => nfcSchema.parse(input))
  .handler(async ({ data }): Promise<LookupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cleanCode = data.nfc.trim();
    let { data: student } = await supabaseAdmin
      .from("students")
      .select("id, suid, name, nfc_no, class_name, room_no, blocked, fingerprints")
      .eq("nfc_no", cleanCode)
      .maybeSingle();

    if (!student) {
      const { data: bySuid } = await supabaseAdmin
        .from("students")
        .select("id, suid, name, nfc_no, class_name, room_no, blocked, fingerprints")
        .ilike("suid", cleanCode)
        .maybeSingle();
      student = bySuid;
    }

    if (!student) return { status: "not_found" };

    if (student.blocked) {
      const { data: msg } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "msg_blocked")
        .maybeSingle();
      return { status: "blocked", message: msg?.value ?? "Card is blocked." };
    }

    const fingerRecords = Array.isArray(student.fingerprints) ? student.fingerprints : [];
    const templates: string[] = [];
    let facePhoto: string | null = null;
    let faceDescriptor: number[] | null = null;

    for (const f of fingerRecords as { type?: string; photo?: string; descriptor?: number[]; template?: string }[]) {
      if (f && f.type === "face" && typeof f.photo === "string") {
        facePhoto = f.photo;
        if (Array.isArray(f.descriptor)) faceDescriptor = f.descriptor;
      } else if (f && typeof f.template === "string" && f.template.trim().length > 0) {
        templates.push(f.template.trim());
      }
    }

    const hasFace = Boolean(facePhoto);
    const hasFingerprint = templates.length > 0;

    if (!hasFace && !hasFingerprint) {
      return {
        status: "no_fingerprint",
        message: "Biometrics not enrolled. Please add Face or Fingerprint in Admin first.",
      };
    }

    return {
      status: "ok",
      studentId: student.id,
      suid: student.suid,
      name: student.name,
      nfc_no: student.nfc_no,
      class_name: student.class_name,
      room_no: student.room_no,
      fingerprintsCount: templates.length,
      templates,
      facePhoto,
      faceDescriptor,
      hasFace,
      hasFingerprint,
    };
  });

export const punchService = createServerFn({ method: "POST" })
  .validator((input: unknown) => punchSchema.parse(input))
  .handler(async ({ data }): Promise<PunchResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: student }, { data: service }, { data: settingsRows }] = await Promise.all([
      supabaseAdmin
        .from("students")
        .select("id, suid, name, nfc_no, class_name, room_no, blocked")
        .eq("nfc_no", data.nfc)
        .maybeSingle(),
      supabaseAdmin
        .from("services")
        .select("id, name, price, print_receipt, active, daily_limit")
        .eq("id", data.serviceId)
        .maybeSingle(),
      supabaseAdmin.from("settings").select("key, value"),
    ]);

    const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
    if (!student || !service || !service.active) return { status: "not_found" };
    if (student.blocked)
      return { status: "blocked", message: settings["msg_blocked"] ?? "Card is blocked." };

    const basePrice = Number(service.price);
    const price = data.customAmount && data.customAmount > 0 ? Number(data.customAmount) : basePrice;

    if (price <= 0) {
      throw new Error("Please enter a valid amount greater than 0.");
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { data: todays } = await supabaseAdmin
      .from("transactions")
      .select("amount, service_id")
      .eq("student_id", student.id)
      .gte("created_at", dayStart.toISOString());

    const rows = todays ?? [];
    const spent = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    const globalLimit = Number(settings["daily_limit"] ?? 0);
    const limitMsg = settings["msg_limit"] ?? "Today's limit is over.";

    if (globalLimit > 0 && spent + price > globalLimit)
      return { status: "limit", message: limitMsg };

    if (service.daily_limit != null) {
      const serviceSpent = rows
        .filter((r) => r.service_id === service.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      if (serviceSpent + price > Number(service.daily_limit))
        return { status: "limit", message: limitMsg };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        student_id: student.id,
        suid: student.suid,
        nfc_no: student.nfc_no,
        student_name: student.name,
        service_id: service.id,
        service_name: service.name,
        amount: price,
      })
      .select("receipt_no, created_at")
      .single();

    if (error || !inserted) {
      throw new Error("Failed to record transaction. Please try again.");
    }

    const successMsg = settings["msg_success"] || "Thank you! Your receipt has been generated.";

    return {
      status: "ok",
      message: successMsg,
      print: service.print_receipt,
      receipt: {
        receiptNo: inserted.receipt_no,
        suid: student.suid,
        name: student.name,
        className: student.class_name,
        roomNo: student.room_no,
        service: service.name,
        amount: price,
        at: inserted.created_at,
      },
    };
  });
