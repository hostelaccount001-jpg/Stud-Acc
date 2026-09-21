import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";

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
    const supabase = getSupabaseAdmin();
    const rows = data.rows;

    if (!rows || rows.length === 0) {
      throw new Error("No ledger rows provided to import.");
    }

    // 1. Fetch all unique GR numbers (suid) from the input rows
    const uniqueGrNos = Array.from(new Set(rows.map((r) => r.gr_no.trim())));

    // 2. Fetch existing students by suid in bulk
    const { data: existingStudents, error: fetchErr } = await supabase
      .from("students")
      .select("id, suid, name, class_name, nfc_no, blocked")
      .in("suid", uniqueGrNos);

    if (fetchErr) {
      throw new Error(`Failed to check existing students: ${fetchErr.message}`);
    }

    const studentMap = new Map<string, any>();
    (existingStudents ?? []).forEach((s) => {
      studentMap.set(s.suid.trim().toLowerCase(), s);
    });

    // 3. For any GR No not found in students, automatically create student record
    const missingStudents = uniqueGrNos.filter((gr) => !studentMap.has(gr.toLowerCase()));
    if (missingStudents.length > 0) {
      const newStudentsPayload = missingStudents.map((gr) => {
        const sampleRow = rows.find((r) => r.gr_no.trim().toLowerCase() === gr.toLowerCase())!;
        return {
          suid: gr,
          name: sampleRow.student_name.trim(),
          class_name: sampleRow.class_name.trim() || null,
          nfc_no: gr,
          fingerprints: [],
          blocked: false,
        };
      });

      const { data: createdStudents, error: createErr } = await supabase
        .from("students")
        .insert(newStudentsPayload)
        .select("id, suid, name, class_name, nfc_no, blocked");

      if (!createErr && createdStudents) {
        createdStudents.forEach((s) => {
          studentMap.set(s.suid.trim().toLowerCase(), s);
        });
      }
    }

    // 4. Prepare transactions to batch insert
    const transactionsToInsert = rows.map((row) => {
      const grKey = row.gr_no.trim().toLowerCase();
      const student = studentMap.get(grKey);

      // Construct descriptive service name so it shows cleanly in kiosk ledger
      const typeTag = row.type === "CREDIT" ? "[Credit]" : "[Debit]";
      const voucherTag = row.unique_no ? ` #${row.unique_no}` : "";
      const modeTag = row.mode ? ` (${row.mode})` : "";
      const baseComment = row.comment.trim() || (row.type === "CREDIT" ? "Daily Credit Deposit" : "Daily Debit");

      const serviceName = `${typeTag} ${baseComment}${voucherTag}${modeTag}`.slice(0, 100);

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
      const { data: inserted, error: insertErr } = await supabase
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
      newStudentsCreated: missingStudents.length,
    };
  });
