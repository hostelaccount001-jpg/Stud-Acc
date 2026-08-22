import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export const getSettingsServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("settings").select("key, value");
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));
  },
);

export const updateSettingsServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const rows = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
      updated_at: now,
    }));

    const { error } = await supabaseAdmin.from("settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { success: true };
  });
