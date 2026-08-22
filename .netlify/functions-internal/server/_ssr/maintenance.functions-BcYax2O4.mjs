import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { r as booleanType, s as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/maintenance.functions-BcYax2O4.js
var formatSchema = objectType({
	formatStudents: booleanType().default(false),
	formatServices: booleanType().default(false),
	formatSettings: booleanType().default(false),
	formatReports: booleanType().default(false),
	formatStaffUsers: booleanType().default(false)
});
var executeErpFormatServer_createServerFn_handler = createServerRpc({
	id: "fbb323801d5c674ff72e26f7f1a51c46c82b2dbcb36d971dea8df4df8e791400",
	name: "executeErpFormatServer",
	filename: "src/lib/maintenance.functions.ts"
}, (opts) => executeErpFormatServer.__executeServer(opts));
var executeErpFormatServer = createServerFn({ method: "POST" }).validator((input) => formatSchema.parse(input)).handler(executeErpFormatServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const results = [];
	if (data.formatStudents) {
		const { error: stErr } = await supabaseAdmin.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
		if (stErr) throw new Error(`Failed to format students: ${stErr.message}`);
		results.push("Students database and biometrics formatted");
	}
	if (data.formatServices) {
		const { error: svcErr } = await supabaseAdmin.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
		if (svcErr) throw new Error(`Failed to format services: ${svcErr.message}`);
		results.push("All services removed completely from database");
	}
	if (data.formatSettings) {
		const defaultSettings = [
			{
				key: "daily_limit",
				value: "500",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "msg_success",
				value: "Thank you! Your receipt has been generated.",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "msg_limit",
				value: "Today's limit is over. Please come tomorrow.",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "msg_blocked",
				value: "Your card is temporarily blocked. Please contact the office.",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "kiosk_title",
				value: "Shree Swaminarayan Gurukul, Rajkot",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "kiosk_subtitle",
				value: "Cashless Service Kiosk",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			},
			{
				key: "receipt_footer",
				value: "Jay Swaminarayan",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}
		];
		const { error: setErr } = await supabaseAdmin.from("settings").upsert(defaultSettings, { onConflict: "key" });
		if (setErr) throw new Error(`Failed to reset settings: ${setErr.message}`);
		results.push("Limits, messages, and titles reset to defaults");
	}
	if (data.formatReports) {
		const { error: txErr } = await supabaseAdmin.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
		if (txErr) throw new Error(`Failed to clear reports & transactions: ${txErr.message}`);
		results.push("Reports and transactions ledger cleared");
	}
	if (data.formatStaffUsers) {
		const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
		const usersToDelete = (usersData?.users ?? []).filter((u) => u.email !== "anshsangani2007@gmail.com");
		for (const u of usersToDelete) {
			await supabaseAdmin.auth.admin.deleteUser(u.id);
			await supabaseAdmin.from("profiles").delete().eq("id", u.id);
			await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id);
		}
		results.push(`Deleted ${usersToDelete.length} staff user accounts (Super Admin preserved)`);
	}
	return {
		success: true,
		messages: results
	};
});
//#endregion
export { executeErpFormatServer_createServerFn_handler };
