import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const updateTxSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0),
  service_name: z.string().min(1),
  student_name: z.string().optional(),
  suid: z.string().optional(),
  operatorUserId: z.string().optional(),
});

const deleteTxSchema = z.object({
  id: z.string().uuid(),
  operatorUserId: z.string().optional(),
});

export const updateTransactionServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateTxSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Enforce reports edit permissions
    if (data.operatorUserId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", data.operatorUserId)
        .maybeSingle();

      const isMaster = profile?.email === "anshsangani2007@gmail.com";
      if (!isMaster) {
        const { data: permSetting } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", `perms_${data.operatorUserId}`)
          .maybeSingle();

        if (permSetting?.value) {
          try {
            const perms = JSON.parse(permSetting.value);
            if (perms.reports_edit === false) {
              throw new Error("Access Denied: You do not have permission to edit transaction records.");
            }
          } catch (e: any) {
            if (e?.message?.startsWith("Access Denied")) throw e;
          }
        }
      }
    }

    const updatePayload: {
      amount: number;
      service_name: string;
      student_name?: string;
      suid?: string;
    } = {
      amount: data.amount,
      service_name: data.service_name,
    };
    if (data.student_name) updatePayload.student_name = data.student_name;
    if (data.suid) updatePayload.suid = data.suid;

    const { data: updated, error } = await supabaseAdmin
      .from("transactions")
      .update(updatePayload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update transaction: ${error.message}`);
    return updated;
  });

export const deleteTransactionServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => deleteTxSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Enforce reports delete permissions
    if (data.operatorUserId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", data.operatorUserId)
        .maybeSingle();

      const isMaster = profile?.email === "anshsangani2007@gmail.com";
      if (!isMaster) {
        const { data: permSetting } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", `perms_${data.operatorUserId}`)
          .maybeSingle();

        if (permSetting?.value) {
          try {
            const perms = JSON.parse(permSetting.value);
            if (perms.reports_delete === false) {
              throw new Error("Access Denied: You do not have permission to delete transaction records.");
            }
          } catch (e: any) {
            if (e?.message?.startsWith("Access Denied")) throw e;
          }
        }
      }
    }

    const { error } = await supabaseAdmin.from("transactions").delete().eq("id", data.id);
    if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
    return { success: true };
  });
