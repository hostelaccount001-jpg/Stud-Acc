import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { l as stringType, o as numberType, s as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/transactions.functions-B5rTEiUp.js
var updateTxSchema = objectType({
	id: stringType().uuid(),
	amount: numberType().min(0),
	service_name: stringType().min(1),
	student_name: stringType().optional(),
	suid: stringType().optional()
});
var deleteTxSchema = objectType({ id: stringType().uuid() });
var updateTransactionServer_createServerFn_handler = createServerRpc({
	id: "7390cb5e079ed9d53059c1614100fd5014e1abce615641c73c19327164d86461",
	name: "updateTransactionServer",
	filename: "src/lib/transactions.functions.ts"
}, (opts) => updateTransactionServer.__executeServer(opts));
var updateTransactionServer = createServerFn({ method: "POST" }).validator((input) => updateTxSchema.parse(input)).handler(updateTransactionServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const updatePayload = {
		amount: data.amount,
		service_name: data.service_name
	};
	if (data.student_name) updatePayload.student_name = data.student_name;
	if (data.suid) updatePayload.suid = data.suid;
	const { data: updated, error } = await supabaseAdmin.from("transactions").update(updatePayload).eq("id", data.id).select().single();
	if (error) throw new Error(`Failed to update transaction: ${error.message}`);
	return updated;
});
var deleteTransactionServer_createServerFn_handler = createServerRpc({
	id: "8785e5024b104cbacd7c107da1175a04e3e957f26cd2ad91e89b2bd01eb5406d",
	name: "deleteTransactionServer",
	filename: "src/lib/transactions.functions.ts"
}, (opts) => deleteTransactionServer.__executeServer(opts));
var deleteTransactionServer = createServerFn({ method: "POST" }).validator((input) => deleteTxSchema.parse(input)).handler(deleteTransactionServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { error } = await supabaseAdmin.from("transactions").delete().eq("id", data.id);
	if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
	return { success: true };
});
//#endregion
export { deleteTransactionServer_createServerFn_handler, updateTransactionServer_createServerFn_handler };
