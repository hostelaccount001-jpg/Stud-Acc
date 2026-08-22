import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { l as stringType, o as numberType, s as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/kiosk.functions-Bzb4k2_X.js
var nfcSchema = objectType({ nfc: stringType().trim().min(1).max(64) });
var identifySchema = objectType({
	probeTemplate: stringType().min(1),
	quality: numberType().optional()
});
var punchSchema = objectType({
	nfc: stringType().trim().min(1).max(64),
	serviceId: stringType().uuid(),
	customAmount: numberType().positive().max(1e4).optional()
});
var getKioskConfig_createServerFn_handler = createServerRpc({
	id: "55889a0ec6983e008fe30c8e23cfd74f10f2b3365df30614a27ac071ae6921cf",
	name: "getKioskConfig",
	filename: "src/lib/kiosk.functions.ts"
}, (opts) => getKioskConfig.__executeServer(opts));
var getKioskConfig = createServerFn({ method: "GET" }).handler(getKioskConfig_createServerFn_handler, async () => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const [{ data: services }, { data: settings }] = await Promise.all([supabaseAdmin.from("services").select("id, name, price, print_receipt").eq("active", true).order("sort_order", { ascending: true }), supabaseAdmin.from("settings").select("key, value")]);
	return {
		services: (services ?? []).map((s) => ({
			...s,
			price: Number(s.price)
		})),
		settings: Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))
	};
});
var identifyStudentByFingerprint_createServerFn_handler = createServerRpc({
	id: "96ed57dfbe2d4a0a4b43cf5dad9a7a363a9d5d3a756e6014a54c7ed2e41aeb08",
	name: "identifyStudentByFingerprint",
	filename: "src/lib/kiosk.functions.ts"
}, (opts) => identifyStudentByFingerprint.__executeServer(opts));
var identifyStudentByFingerprint = createServerFn({ method: "POST" }).validator((input) => identifySchema.parse(input)).handler(identifyStudentByFingerprint_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data: students } = await supabaseAdmin.from("students").select("id, suid, name, nfc_no, class_name, room_no, blocked, fingerprints").eq("blocked", false);
	const enrolled = (students ?? []).filter((s) => Array.isArray(s.fingerprints) && s.fingerprints.length > 0);
	if (enrolled.length === 0) return { status: "not_found" };
	for (const s of enrolled) for (const f of s.fingerprints) if (f.template && f.template === data.probeTemplate) return {
		status: "identified",
		studentId: s.id,
		suid: s.suid,
		name: s.name,
		nfc_no: s.nfc_no,
		class_name: s.class_name,
		room_no: s.room_no
	};
	let bestStudent = enrolled[0];
	let bestScore = -1;
	try {
		const probeBuf = Buffer.from(data.probeTemplate, "base64");
		for (const s of enrolled) for (const f of s.fingerprints) {
			if (!f.template) continue;
			const galBuf = Buffer.from(f.template, "base64");
			const len = Math.min(probeBuf.length, galBuf.length);
			let matches = 0;
			for (let i = 0; i < len; i++) if (probeBuf[i] === galBuf[i]) matches++;
			const score = matches / len;
			if (score > bestScore) {
				bestScore = score;
				bestStudent = s;
			}
		}
	} catch {}
	if (bestStudent) return {
		status: "identified",
		studentId: bestStudent.id,
		suid: bestStudent.suid,
		name: bestStudent.name,
		nfc_no: bestStudent.nfc_no,
		class_name: bestStudent.class_name,
		room_no: bestStudent.room_no
	};
	return { status: "not_found" };
});
var lookupStudent_createServerFn_handler = createServerRpc({
	id: "1d5a1e810a97b067bedbb2be20989f9eb403e34bf9ac70e2d432b14825fa6220",
	name: "lookupStudent",
	filename: "src/lib/kiosk.functions.ts"
}, (opts) => lookupStudent.__executeServer(opts));
var lookupStudent = createServerFn({ method: "POST" }).validator((input) => nfcSchema.parse(input)).handler(lookupStudent_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data: student } = await supabaseAdmin.from("students").select("id, suid, name, nfc_no, class_name, room_no, blocked, fingerprints").eq("nfc_no", data.nfc).maybeSingle();
	if (!student) return { status: "not_found" };
	if (student.blocked) {
		const { data: msg } = await supabaseAdmin.from("settings").select("value").eq("key", "msg_blocked").maybeSingle();
		return {
			status: "blocked",
			message: msg?.value ?? "Card is blocked."
		};
	}
	const fingerRecords = Array.isArray(student.fingerprints) ? student.fingerprints : [];
	if (fingerRecords.length === 0) return {
		status: "no_fingerprint",
		message: "Fingerprint verification failed. Biometrics not enrolled for this card."
	};
	return {
		status: "ok",
		studentId: student.id,
		suid: student.suid,
		name: student.name,
		nfc_no: student.nfc_no,
		class_name: student.class_name,
		room_no: student.room_no,
		fingerprintsCount: fingerRecords.length
	};
});
var punchService_createServerFn_handler = createServerRpc({
	id: "5abd70b1ff23239a01bb372fe347698a0bd6e55d385dca58a4f3fb58ae60f7b7",
	name: "punchService",
	filename: "src/lib/kiosk.functions.ts"
}, (opts) => punchService.__executeServer(opts));
var punchService = createServerFn({ method: "POST" }).validator((input) => punchSchema.parse(input)).handler(punchService_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const [{ data: student }, { data: service }, { data: settingsRows }] = await Promise.all([
		supabaseAdmin.from("students").select("id, suid, name, nfc_no, class_name, room_no, blocked").eq("nfc_no", data.nfc).maybeSingle(),
		supabaseAdmin.from("services").select("id, name, price, print_receipt, active, daily_limit").eq("id", data.serviceId).maybeSingle(),
		supabaseAdmin.from("settings").select("key, value")
	]);
	const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
	if (!student || !service || !service.active) return { status: "not_found" };
	if (student.blocked) return {
		status: "blocked",
		message: settings["msg_blocked"] ?? "Card is blocked."
	};
	const basePrice = Number(service.price);
	const price = data.customAmount && data.customAmount > 0 ? Number(data.customAmount) : basePrice;
	if (price <= 0) throw new Error("Please enter a valid amount greater than 0.");
	const dayStart = /* @__PURE__ */ new Date();
	dayStart.setHours(0, 0, 0, 0);
	const { data: todays } = await supabaseAdmin.from("transactions").select("amount, service_id").eq("student_id", student.id).gte("created_at", dayStart.toISOString());
	const rows = todays ?? [];
	const spent = rows.reduce((sum, r) => sum + Number(r.amount), 0);
	const globalLimit = Number(settings["daily_limit"] ?? 0);
	const limitMsg = settings["msg_limit"] ?? "Today's limit is over.";
	if (globalLimit > 0 && spent + price > globalLimit) return {
		status: "limit",
		message: limitMsg
	};
	if (service.daily_limit != null) {
		if (rows.filter((r) => r.service_id === service.id).reduce((sum, r) => sum + Number(r.amount), 0) + price > Number(service.daily_limit)) return {
			status: "limit",
			message: limitMsg
		};
	}
	const { data: inserted, error } = await supabaseAdmin.from("transactions").insert({
		student_id: student.id,
		suid: student.suid,
		nfc_no: student.nfc_no,
		student_name: student.name,
		service_id: service.id,
		service_name: service.name,
		amount: price
	}).select("receipt_no, created_at").single();
	if (error || !inserted) throw new Error("Failed to record transaction. Please try again.");
	return {
		status: "ok",
		message: settings["msg_success"] || "Thank you! Your receipt has been generated.",
		print: service.print_receipt,
		receipt: {
			receiptNo: inserted.receipt_no,
			suid: student.suid,
			name: student.name,
			className: student.class_name,
			roomNo: student.room_no,
			service: service.name,
			amount: price,
			at: inserted.created_at
		}
	};
});
//#endregion
export { getKioskConfig_createServerFn_handler, identifyStudentByFingerprint_createServerFn_handler, lookupStudent_createServerFn_handler, punchService_createServerFn_handler };
