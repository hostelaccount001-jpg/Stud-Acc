import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { l as stringType, n as arrayType, r as booleanType, s as objectType, t as anyType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/students.functions-CF-l_iUh.js
var studentInputSchema = objectType({
	suid: stringType().trim().min(1).max(40),
	name: stringType().trim().min(1).max(120),
	nfc_no: stringType().trim().min(1).max(64),
	class_name: stringType().trim().max(60).optional().nullable(),
	room_no: stringType().trim().max(60).optional().nullable(),
	fingerprints: arrayType(anyType()).optional()
});
var deleteStudentServer_createServerFn_handler = createServerRpc({
	id: "c98dbd8dd257e5e970a37dd70a011216ffc84110bc9eab7543596c8318b136c2",
	name: "deleteStudentServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => deleteStudentServer.__executeServer(opts));
var deleteStudentServer = createServerFn({ method: "POST" }).validator((input) => objectType({ id: stringType() }).parse(input)).handler(deleteStudentServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	await supabaseAdmin.from("transactions").delete().eq("student_id", data.id);
	const { data: del, error } = await supabaseAdmin.from("students").delete().eq("id", data.id).select("id");
	if (error) throw new Error(error.message);
	return {
		success: true,
		count: del?.length ?? 0
	};
});
var deleteAllStudentsServer_createServerFn_handler = createServerRpc({
	id: "ad6d966fa32b3b992045599285ba09d680ee6e0e99dca5f50ef713574ae11c4f",
	name: "deleteAllStudentsServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => deleteAllStudentsServer.__executeServer(opts));
var deleteAllStudentsServer = createServerFn({ method: "POST" }).handler(deleteAllStudentsServer_createServerFn_handler, async () => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	await supabaseAdmin.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
	const { data: del, error } = await supabaseAdmin.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
	if (error) throw new Error(error.message);
	return {
		success: true,
		count: del?.length ?? 0
	};
});
var addStudentServer_createServerFn_handler = createServerRpc({
	id: "3a78f93b1696d6c5d0a40ef9812845d9b87afeef64dc2f1bb9508e32867ed14b",
	name: "addStudentServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => addStudentServer.__executeServer(opts));
var addStudentServer = createServerFn({ method: "POST" }).validator((input) => studentInputSchema.parse(input)).handler(addStudentServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { error } = await supabaseAdmin.from("students").insert({
		suid: data.suid,
		name: data.name,
		nfc_no: data.nfc_no,
		class_name: data.class_name || null,
		room_no: data.room_no || null,
		fingerprints: data.fingerprints || []
	});
	if (error) throw new Error(error.message);
	return { success: true };
});
var updateStudentServer_createServerFn_handler = createServerRpc({
	id: "a0c3294270055ec8a81f6c31a4125e626bb3d7038ece8ce111ae320ac6513fae",
	name: "updateStudentServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => updateStudentServer.__executeServer(opts));
var updateStudentServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	id: stringType(),
	data: studentInputSchema
}).parse(input)).handler(updateStudentServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { error } = await supabaseAdmin.from("students").update({
		suid: data.data.suid,
		name: data.data.name,
		nfc_no: data.data.nfc_no,
		class_name: data.data.class_name || null,
		room_no: data.data.room_no || null,
		fingerprints: data.data.fingerprints || [],
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.id);
	if (error) throw new Error(error.message);
	return { success: true };
});
var toggleBlockServer_createServerFn_handler = createServerRpc({
	id: "e89aaa718b07b11cddf44329c22e32ea9d070a674f2d34760bbf01aaf38408ad",
	name: "toggleBlockServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => toggleBlockServer.__executeServer(opts));
var toggleBlockServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	id: stringType(),
	blocked: booleanType()
}).parse(input)).handler(toggleBlockServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { error } = await supabaseAdmin.from("students").update({ blocked: data.blocked }).eq("id", data.id);
	if (error) throw new Error(error.message);
	return { success: true };
});
var bulkUploadStudentsServer_createServerFn_handler = createServerRpc({
	id: "d12b36d4ddaa4621c2647c70d80e73d01b07dbadbe47efd84145aec1640e266a",
	name: "bulkUploadStudentsServer",
	filename: "src/lib/students.functions.ts"
}, (opts) => bulkUploadStudentsServer.__executeServer(opts));
var bulkUploadStudentsServer = createServerFn({ method: "POST" }).validator((input) => arrayType(studentInputSchema).parse(input)).handler(bulkUploadStudentsServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	let count = 0;
	for (const d of data) {
		const { error } = await supabaseAdmin.from("students").upsert({
			suid: d.suid,
			name: d.name,
			nfc_no: d.nfc_no,
			class_name: d.class_name || null,
			room_no: d.room_no || null,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}, { onConflict: "suid" });
		if (!error) count++;
		else {
			const { error: insErr } = await supabaseAdmin.from("students").insert({
				suid: d.suid,
				name: d.name,
				nfc_no: d.nfc_no,
				class_name: d.class_name || null,
				room_no: d.room_no || null
			});
			if (!insErr) count++;
		}
	}
	return { count };
});
//#endregion
export { addStudentServer_createServerFn_handler, bulkUploadStudentsServer_createServerFn_handler, deleteAllStudentsServer_createServerFn_handler, deleteStudentServer_createServerFn_handler, toggleBlockServer_createServerFn_handler, updateStudentServer_createServerFn_handler };
