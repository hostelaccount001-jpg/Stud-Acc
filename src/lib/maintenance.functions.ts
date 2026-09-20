import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const formatSchema = z.object({
  formatStudents: z.boolean().default(false),
  formatServices: z.boolean().default(false),
  formatSettings: z.boolean().default(false),
  formatReports: z.boolean().default(false),
  formatStaffUsers: z.boolean().default(false),
});

export const executeErpFormatServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => formatSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: string[] = [];

    // 1. Students Module Format
    if (data.formatStudents) {
      const { error: stErr } = await supabaseAdmin
        .from("students")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (stErr) throw new Error(`Failed to format students: ${stErr.message}`);
      results.push("Students database and biometrics formatted");
    }

    // 2. Services Module Format
    if (data.formatServices) {
      const { error: svcErr } = await supabaseAdmin
        .from("services")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (svcErr) throw new Error(`Failed to format services: ${svcErr.message}`);
      results.push("All services removed completely from database");
    }

    // 3. Limits & Messages (Settings) Module Format
    if (data.formatSettings) {
      const defaultSettings = [
        { key: "daily_limit", value: "500", updated_at: new Date().toISOString() },
        { key: "msg_success", value: "Thank you! Your receipt has been generated.", updated_at: new Date().toISOString() },
        { key: "msg_limit", value: "Today's limit is over. Please come tomorrow.", updated_at: new Date().toISOString() },
        { key: "msg_blocked", value: "Your card is temporarily blocked. Please contact the office.", updated_at: new Date().toISOString() },
        { key: "kiosk_title", value: "Shree Swaminarayan Gurukul, Rajkot", updated_at: new Date().toISOString() },
        { key: "kiosk_subtitle", value: "Cashless Service Kiosk", updated_at: new Date().toISOString() },
        { key: "receipt_footer", value: "Jay Swaminarayan", updated_at: new Date().toISOString() },
      ];
      const { error: setErr } = await supabaseAdmin
        .from("settings")
        .upsert(defaultSettings, { onConflict: "key" });
      if (setErr) throw new Error(`Failed to reset settings: ${setErr.message}`);
      results.push("Limits, messages, and titles reset to defaults");
    }

    // 4. Reports (Transactions Ledger) Module Format
    if (data.formatReports) {
      const { error: txErr } = await supabaseAdmin
        .from("transactions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (txErr) throw new Error(`Failed to clear reports & transactions: ${txErr.message}`);
      results.push("Reports and transactions ledger cleared");
    }

    // 5. Users & Roles (Staff Accounts) Module Format
    if (data.formatStaffUsers) {
      // Get all staff users except the primary super admin
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const usersToDelete = (usersData?.users ?? []).filter(
        (u) => u.email !== "anshsangani2007@gmail.com"
      );
      for (const u of usersToDelete) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
        await supabaseAdmin.from("profiles").delete().eq("id", u.id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id);
      }
      results.push(`Deleted ${usersToDelete.length} staff user accounts (Super Admin preserved)`);
    }

    return {
      success: true,
      messages: results,
    };
  });
