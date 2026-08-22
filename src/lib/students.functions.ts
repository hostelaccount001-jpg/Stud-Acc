import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const studentInputSchema = z.object({
  suid: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  nfc_no: z.string().trim().min(1).max(64),
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
      nfc_no: data.nfc_no,
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
        nfc_no: data.data.nfc_no,
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
  .validator((input: unknown) => z.array(studentInputSchema).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let count = 0;
    for (const d of data) {
      const { error } = await supabaseAdmin.from("students").upsert(
        {
          suid: d.suid,
          name: d.name,
          nfc_no: d.nfc_no,
          class_name: d.class_name || null,
          room_no: d.room_no || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "suid" },
      );
      if (!error) count++;
      else {
        // Fallback insert if upsert had unique constraint issue
        const { error: insErr } = await supabaseAdmin.from("students").insert({
          suid: d.suid,
          name: d.name,
          nfc_no: d.nfc_no,
          class_name: d.class_name || null,
          room_no: d.room_no || null,
        });
        if (!insErr) count++;
      }
    }
    return { count };
  });
