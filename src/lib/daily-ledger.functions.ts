import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const dailyLedgerRowSchema = z.object({
  unique_no: z.string().default(""),
  student_name: z.string().min(1),
  gr_no: z.string().min(1),
  class_name: z.string().default(""),
  type: z.enum(["CREDIT", "DEBIT"]).default("CREDIT"),
  mode: z.string().default("Cash"),
  date: z.string().default(""),
  amount: z.number().positive(),
  comment: z.string().default(""),
});

export type DailyLedgerRow = z.infer<typeof dailyLedgerRowSchema>;

const importDailyLedgerInput = z.object({
  rows: z.array(dailyLedgerRowSchema),
  batchNote: z.string().optional(),
});

export const importDailyLedgerServer = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof importDailyLedgerInput>) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.rows;

    if (!rows || rows.length === 0) {
      throw new Error("No ledger rows provided to import.");
    }

    // 1. Collect all unique identifiers (Student ID / unique_no, and GR No)
    const allIdentifiers = Array.from(
      new Set([
        ...rows.map((r) => r.unique_no.trim()).filter(Boolean),
        ...rows.map((r) => r.gr_no.trim()).filter(Boolean),
      ])
    );

    // 2. Fetch existing students by suid or nfc_no in bulk
    const { data: existingStudents, error: fetchErr } = await supabaseAdmin
      .from("students")
      .select("id, suid, name, class_name, nfc_no, blocked");

    if (fetchErr) {
      throw new Error(`Failed to check existing students: ${fetchErr.message}`);
    }

    const studentMap = new Map<string, any>();
    (existingStudents ?? []).forEach((s) => {
      if (s.suid) studentMap.set(s.suid.trim().toLowerCase(), s);
      if (s.nfc_no) studentMap.set(s.nfc_no.trim().toLowerCase(), s);
      if (s.name) studentMap.set(s.name.trim().toLowerCase(), s);
    });

    // 3. For any student not found, automatically create student record
    const missingRows: DailyLedgerRow[] = [];
    rows.forEach((r) => {
      const uKey = r.unique_no.trim().toLowerCase();
      const gKey = r.gr_no.trim().toLowerCase();
      const nKey = r.student_name.trim().toLowerCase();
      if (!studentMap.has(uKey) && !studentMap.has(gKey) && !studentMap.has(nKey)) {
        if (!missingRows.some((m) => (m.unique_no && m.unique_no === r.unique_no) || (m.gr_no && m.gr_no === r.gr_no))) {
          missingRows.push(r);
        }
      }
    });

    if (missingRows.length > 0) {
      const newStudentsPayload = missingRows.map((sampleRow) => {
        const primaryId = sampleRow.unique_no.trim() || sampleRow.gr_no.trim();
        return {
          suid: primaryId,
          name: sampleRow.student_name.trim(),
          class_name: sampleRow.class_name.trim() || null,
          nfc_no: sampleRow.gr_no.trim() || primaryId,
          fingerprints: [],
          blocked: false,
        };
      });

      const { data: createdStudents, error: createErr } = await supabaseAdmin
        .from("students")
        .insert(newStudentsPayload)
        .select("id, suid, name, class_name, nfc_no, blocked");

      if (!createErr && createdStudents) {
        createdStudents.forEach((s) => {
          if (s.suid) studentMap.set(s.suid.trim().toLowerCase(), s);
          if (s.nfc_no) studentMap.set(s.nfc_no.trim().toLowerCase(), s);
          if (s.name) studentMap.set(s.name.trim().toLowerCase(), s);
        });
      }
    }

    // 4. Prepare transactions to batch insert
    const transactionsToInsert = rows.map((row) => {
      const uKey = row.unique_no.trim().toLowerCase();
      const gKey = row.gr_no.trim().toLowerCase();
      const nKey = row.student_name.trim().toLowerCase();
      const student = studentMap.get(uKey) || studentMap.get(gKey) || studentMap.get(nKey);

      // Construct descriptive service name so it shows cleanly in kiosk ledger
      const typeTag = row.type === "CREDIT" ? "[Credit]" : "[Debit]";
      const voucherTag = row.unique_no ? ` #${row.unique_no}` : "";
      const modeTag = row.mode ? ` (${row.mode})` : "";
      const baseComment = row.comment.trim() || (row.type === "CREDIT" ? "Daily Credit Deposit" : "Daily Debit");

      const serviceName = `[Wallet] ${typeTag} ${baseComment}${voucherTag}${modeTag}`.slice(0, 100);

      // Parse date if valid DD/MM/YYYY or YYYY-MM-DD
      let createdAt = new Date().toISOString();
      if (row.date) {
        try {
          if (row.date.includes("/")) {
            const parts = row.date.split("/");
            if (parts.length === 3) {
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parseInt(parts[2], 10);
              const parsed = new Date(Date.UTC(y, m, d, 12, 0, 0));
              if (!isNaN(parsed.getTime())) {
                createdAt = parsed.toISOString();
              }
            }
          } else {
            const parsed = new Date(row.date);
            if (!isNaN(parsed.getTime())) {
              createdAt = parsed.toISOString();
            }
          }
        } catch {
          // fallback to current time
        }
      }

      return {
        student_id: student ? student.id : null,
        suid: row.gr_no.trim(),
        nfc_no: student?.nfc_no || row.gr_no.trim(),
        student_name: row.student_name.trim() || student?.name || "Student",
        service_id: null,
        service_name: serviceName,
        amount: Math.abs(row.amount),
        created_at: createdAt,
      };
    });

    // 5. Batch insert transactions in chunks of 100 to avoid payload limits
    const CHUNK_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < transactionsToInsert.length; i += CHUNK_SIZE) {
      const chunk = transactionsToInsert.slice(i, i + CHUNK_SIZE);
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("transactions")
        .insert(chunk)
        .select("id");

      if (insertErr) {
        throw new Error(`Transaction insert failed at chunk ${i / CHUNK_SIZE + 1}: ${insertErr.message}`);
      }
      totalInserted += inserted?.length ?? chunk.length;
    }

    return {
      success: true,
      totalProcessed: rows.length,
      totalInserted,
      newStudentsCreated: missingRows.length,
    };
  });

export const getWalletLedgerDataServer = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [txRes, studentsRes] = await Promise.all([
      supabaseAdmin
        .from("transactions")
        .select("id, suid, student_name, service_name, amount, created_at, receipt_no, service_id")
        .or("service_id.is.null,service_name.ilike.[Wallet]%")
        .order("created_at", { ascending: false })
        .limit(10000),
      supabaseAdmin
        .from("students")
        .select("id, suid, name, class_name, room_no, blocked")
        .order("name", { ascending: true })
        .limit(5000),
    ]);

    return {
      transactions: txRes.data ?? [],
      students: studentsRes.data ?? [],
    };
  });

export const manualWalletTransactionServer = createServerFn({ method: "POST" })
  .validator((data: {
    gr_no: string;
    student_name?: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    comment: string;
    mode?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gr = data.gr_no.trim();

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, suid, name, nfc_no")
      .eq("suid", gr)
      .maybeSingle();

    const typeTag = data.type === "CREDIT" ? "[Credit]" : "[Debit]";
    const modeTag = data.mode ? ` (${data.mode})` : " (Manual)";
    const comment = data.comment.trim() || (data.type === "CREDIT" ? "Manual Credit Deposit" : "Manual Debit Adjustment");
    const serviceName = `[Wallet] ${typeTag} ${comment}${modeTag}`.slice(0, 100);

    const { data: inserted, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        student_id: student?.id ?? null,
        suid: gr,
        student_name: student?.name ?? data.student_name ?? "Student",
        service_name: serviceName,
        amount: Math.abs(data.amount),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add manual transaction: ${error.message}`);
    }

    return { success: true, transaction: inserted };
  });
