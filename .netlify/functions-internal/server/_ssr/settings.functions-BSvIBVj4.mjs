import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { c as recordType, l as stringType, s as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.functions-BSvIBVj4.js
var updateSettingsSchema = objectType({ settings: recordType(stringType(), stringType()) });
var getSettingsServer_createServerFn_handler = createServerRpc({
	id: "ebb52917c35c248007f994cccb2ee14c4fd782aaee457a5d031c0ca04ceda6db",
	name: "getSettingsServer",
	filename: "src/lib/settings.functions.ts"
}, (opts) => getSettingsServer.__executeServer(opts));
var getSettingsServer = createServerFn({ method: "GET" }).handler(getSettingsServer_createServerFn_handler, async () => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data, error } = await supabaseAdmin.from("settings").select("key, value");
	if (error) throw new Error(error.message);
	return Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));
});
var updateSettingsServer_createServerFn_handler = createServerRpc({
	id: "7432560bf7bc4326bb83290ab23b6f5f4cd85b37f5ca771c09426a3c1153eeb4",
	name: "updateSettingsServer",
	filename: "src/lib/settings.functions.ts"
}, (opts) => updateSettingsServer.__executeServer(opts));
var updateSettingsServer = createServerFn({ method: "POST" }).validator((input) => updateSettingsSchema.parse(input)).handler(updateSettingsServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const rows = Object.entries(data.settings).map(([key, value]) => ({
		key,
		value: String(value ?? ""),
		updated_at: now
	}));
	const { error } = await supabaseAdmin.from("settings").upsert(rows, { onConflict: "key" });
	if (error) throw new Error(error.message);
	return { success: true };
});
//#endregion
export { getSettingsServer_createServerFn_handler, updateSettingsServer_createServerFn_handler };
