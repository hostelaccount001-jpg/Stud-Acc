import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const updateTxSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0),
  service_name: z.string().min(1),
  student_name: z.string().optional(),
  suid: z.string().optional(),
});

const deleteTxSchema = z.object({
  id: z.string().uuid(),
});

export const updateTransactionServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateTxSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

    const { error } = await supabaseAdmin.from("transactions").delete().eq("id", data.id);
    if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
    return { success: true };
  });
