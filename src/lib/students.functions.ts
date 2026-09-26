import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const studentInputSchema = z.object({
  suid: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  nfc_no: z.string().trim().max(64).optional().nullable(),
  class_name: z.string().trim().max(60).optional().nullable(),
  room_no: z.string().trim().max(60).optional().nullable(),
  fingerprints: z.array(z.any()).optional(),
});

export const deleteStudentServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("transactions").delete().eq("student_id", data.id);
    const { data: del, error } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    return { success: true, count: del?.length ?? 0 };
  });

export const deleteSelectedStudentsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ ids: z.array(z.string()).min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("transactions").delete().in("student_id", data.ids);
    const { data: del, error } = await supabaseAdmin
      .from("students")
      .delete()
      .in("id", data.ids)
      .select("id");
    if (error) throw new Error(error.message);
    return { success: true, count: del?.length ?? 0 };
  });

export const deleteAllStudentsServer = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { data: del, error } = await supabaseAdmin
      .from("students")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (error) throw new Error(error.message);
    return { success: true, count: del?.length ?? 0 };
  },
);

export const addStudentServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => studentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("students").insert({
      suid: data.suid,
      name: data.name,
      nfc_no: data.nfc_no || data.suid,
      class_name: data.class_name || null,
      room_no: data.room_no || null,
      fingerprints: data.fingerprints || [],
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateStudentServer = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        id: z.string(),
        data: studentInputSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("students")
      .update({
        suid: data.data.suid,
        name: data.data.name,
        nfc_no: data.data.nfc_no || data.data.suid,
        class_name: data.data.class_name || null,
        room_no: data.data.room_no || null,
        fingerprints: data.data.fingerprints || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const toggleBlockServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string(), blocked: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("students").update({ blocked: data.blocked }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const bulkUploadStudentsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (input && typeof input === "object" && "data" in input && Array.isArray((input as any).data)) {
      return z.array(studentInputSchema).parse((input as any).data);
    }
    return z.array(studentInputSchema).parse(input);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let count = 0;
    for (const d of data) {
      // Check for existing student to preserve existing biometrics and NFC credentials
      const { data: existing } = await supabaseAdmin
        .from("students")
        .select("id, fingerprints, nfc_no")
        .eq("suid", d.suid)
        .maybeSingle();

      const { error } = await supabaseAdmin.from("students").upsert(
        {
          suid: d.suid,
          name: d.name,
          nfc_no: d.nfc_no || existing?.nfc_no || d.suid,
          class_name: d.class_name ? String(d.class_name).trim() : null,
          room_no: d.room_no ? String(d.room_no).trim() : null,
          fingerprints: (d.fingerprints && d.fingerprints.length > 0) ? d.fingerprints : (existing?.fingerprints || []),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "suid" },
      );
      if (!error) {
        count++;
      } else {
        console.error("Bulk upload error for suid", d.suid, error);
      }
    }
    return { count };
  });
