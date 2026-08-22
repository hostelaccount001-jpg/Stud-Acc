import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { i as enumType, l as stringType, r as booleanType, s as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-DdrnMXSa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/staff.functions-D8XyqJrA.js
var defaultStaffPermissions = {
	dashboard: true,
	students: false,
	services: false,
	settings: false,
	reports: true,
	users: false
};
var defaultAdminPermissions = {
	dashboard: true,
	students: true,
	services: true,
	settings: true,
	reports: true,
	users: false
};
var defaultSuperAdminPermissions = {
	dashboard: true,
	students: true,
	services: true,
	settings: true,
	reports: true,
	users: true
};
var createStaffSchema = objectType({
	email: stringType().trim().email(),
	password: stringType().min(6, "Password must be at least 6 characters"),
	fullName: stringType().trim().min(1, "Full name is required"),
	role: enumType([
		"super_admin",
		"admin",
		"staff"
	]).default("staff"),
	permissions: objectType({
		dashboard: booleanType().default(true),
		students: booleanType().default(false),
		services: booleanType().default(false),
		settings: booleanType().default(false),
		reports: booleanType().default(true),
		users: booleanType().default(false)
	}).optional()
});
var listStaffUsersServer_createServerFn_handler = createServerRpc({
	id: "80fa0f9c92c5416e2b75d8f06acf1b8cbcd87b0c13be804e56c7eb11f266f141",
	name: "listStaffUsersServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => listStaffUsersServer.__executeServer(opts));
var listStaffUsersServer = createServerFn({ method: "GET" }).handler(listStaffUsersServer_createServerFn_handler, async () => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const [{ data: profiles }, { data: roles }, { data: permSettings }] = await Promise.all([
		supabaseAdmin.from("profiles").select("id, email, full_name, created_at").order("created_at"),
		supabaseAdmin.from("user_roles").select("user_id, role"),
		supabaseAdmin.from("settings").select("key, value").like("key", "perms_%")
	]);
	const permMap = {};
	(permSettings ?? []).forEach((row) => {
		try {
			const userId = row.key.replace("perms_", "");
			permMap[userId] = JSON.parse(row.value);
		} catch {}
	});
	return (profiles ?? []).map((p) => {
		const userRoles = (roles ?? []).filter((r) => r.user_id === p.id);
		const isMaster = p.email === "anshsangani2007@gmail.com";
		const hasAdmin = userRoles.some((r) => r.role === "admin");
		const savedPerms = permMap[p.id];
		let permissions = defaultStaffPermissions;
		if (isMaster) permissions = defaultSuperAdminPermissions;
		else if (savedPerms) permissions = savedPerms;
		else if (hasAdmin) permissions = defaultAdminPermissions;
		const isSuper = isMaster || permissions.users && hasAdmin;
		return {
			id: p.id,
			email: p.email ?? "",
			full_name: p.full_name ?? "",
			created_at: p.created_at,
			role: isSuper ? "super_admin" : hasAdmin ? "admin" : "staff",
			isSuperAdmin: isMaster,
			permissions
		};
	});
});
var getCurrentUserPermissionsServer_createServerFn_handler = createServerRpc({
	id: "e670b09579661e0ddbb977f043dc7c32830ea932d9239fba189a138c5dcfef94",
	name: "getCurrentUserPermissionsServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => getCurrentUserPermissionsServer.__executeServer(opts));
var getCurrentUserPermissionsServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	userId: stringType(),
	email: stringType().optional()
}).parse(input)).handler(getCurrentUserPermissionsServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	if (data.email === "anshsangani2007@gmail.com") return {
		role: "super_admin",
		isSuperAdmin: true,
		permissions: defaultSuperAdminPermissions
	};
	const [{ data: roles }, { data: permSetting }] = await Promise.all([supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId), supabaseAdmin.from("settings").select("value").eq("key", `perms_${data.userId}`).maybeSingle()]);
	const hasAdmin = (roles ?? []).some((r) => r.role === "admin");
	let permissions = hasAdmin ? defaultAdminPermissions : defaultStaffPermissions;
	if (permSetting?.value) try {
		permissions = {
			...permissions,
			...JSON.parse(permSetting.value)
		};
	} catch {}
	const isSuper = permissions.users && hasAdmin;
	return {
		role: isSuper ? "super_admin" : hasAdmin ? "admin" : "staff",
		isSuperAdmin: isSuper,
		permissions
	};
});
var createStaffUserServer_createServerFn_handler = createServerRpc({
	id: "5ddb5cc8c95b39c6c392ed7e3af86406511edad853e73662e1a3396064297bec",
	name: "createStaffUserServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => createStaffUserServer.__executeServer(opts));
var createStaffUserServer = createServerFn({ method: "POST" }).validator((input) => createStaffSchema.parse(input)).handler(createStaffUserServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
		email: data.email,
		password: data.password,
		email_confirm: true,
		user_metadata: { full_name: data.fullName }
	});
	if (authErr) throw new Error(authErr.message);
	const userId = newUser.user.id;
	await supabaseAdmin.from("profiles").upsert({
		id: userId,
		email: data.email,
		full_name: data.fullName
	});
	if (data.role === "admin" || data.role === "super_admin") await supabaseAdmin.from("user_roles").upsert({
		user_id: userId,
		role: "admin"
	}, { onConflict: "user_id,role" });
	else await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
	const permissions = data.permissions || (data.role === "super_admin" ? defaultSuperAdminPermissions : data.role === "admin" ? defaultAdminPermissions : defaultStaffPermissions);
	await supabaseAdmin.from("settings").upsert({
		key: `perms_${userId}`,
		value: JSON.stringify(permissions)
	});
	return {
		success: true,
		userId
	};
});
var updateStaffPermissionsServer_createServerFn_handler = createServerRpc({
	id: "27213b8a016bd040457e2146591ef17d31c2e4bf8b5b73e394d272aeb120497d",
	name: "updateStaffPermissionsServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => updateStaffPermissionsServer.__executeServer(opts));
var updateStaffPermissionsServer = createServerFn({ method: "POST" }).validator(objectType({
	userId: stringType(),
	role: enumType([
		"super_admin",
		"admin",
		"staff"
	]),
	permissions: objectType({
		dashboard: booleanType(),
		students: booleanType(),
		services: booleanType(),
		settings: booleanType(),
		reports: booleanType(),
		users: booleanType()
	})
}).parse).handler(updateStaffPermissionsServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).maybeSingle();
	if (profile?.email === "anshsangani2007@gmail.com") return { success: true };
	if (data.role === "admin" || data.role === "super_admin" || data.permissions.students || data.permissions.services) await supabaseAdmin.from("user_roles").upsert({
		user_id: data.userId,
		role: "admin"
	}, { onConflict: "user_id,role" });
	else await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
	await supabaseAdmin.from("settings").upsert({
		key: `perms_${data.userId}`,
		value: JSON.stringify(data.permissions)
	});
	return { success: true };
});
var deleteStaffUserServer_createServerFn_handler = createServerRpc({
	id: "a9e48184bc073159b7a2e7ceb44b9426ba01549379cb692ad1bc8e4dbbeec16d",
	name: "deleteStaffUserServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => deleteStaffUserServer.__executeServer(opts));
var deleteStaffUserServer = createServerFn({ method: "POST" }).validator((input) => objectType({ userId: stringType() }).parse(input)).handler(deleteStaffUserServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).maybeSingle();
	if (profile?.email === "anshsangani2007@gmail.com") throw new Error("Cannot delete Master Super Admin account.");
	await supabaseAdmin.from("settings").delete().eq("key", `perms_${data.userId}`);
	await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
	await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
	await supabaseAdmin.auth.admin.deleteUser(data.userId);
	return { success: true };
});
var resetStaffPasswordServer_createServerFn_handler = createServerRpc({
	id: "314a07cdc10e7d020d2c416f2a85c109cfa18bdb9a53c31159ffaea73fbb64ce",
	name: "resetStaffPasswordServer",
	filename: "src/lib/staff.functions.ts"
}, (opts) => resetStaffPasswordServer.__executeServer(opts));
var resetStaffPasswordServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	userId: stringType(),
	newPassword: stringType().min(6)
}).parse(input)).handler(resetStaffPasswordServer_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-Dssmk1Yb.mjs");
	const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
	if (error) throw new Error(error.message);
	return { success: true };
});
//#endregion
export { createStaffUserServer_createServerFn_handler, deleteStaffUserServer_createServerFn_handler, getCurrentUserPermissionsServer_createServerFn_handler, listStaffUsersServer_createServerFn_handler, resetStaffPasswordServer_createServerFn_handler, updateStaffPermissionsServer_createServerFn_handler };
