import { i as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-Cy02cvZt.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./createSsrRpc-humr6_nj.mjs";
import { i as enumType, l as stringType, r as booleanType, s as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-DaEVBLuH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
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
var listStaffUsersServer = createServerFn({ method: "GET" }).handler(createSsrRpc("80fa0f9c92c5416e2b75d8f06acf1b8cbcd87b0c13be804e56c7eb11f266f141"));
var getCurrentUserPermissionsServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	userId: stringType(),
	email: stringType().optional()
}).parse(input)).handler(createSsrRpc("e670b09579661e0ddbb977f043dc7c32830ea932d9239fba189a138c5dcfef94"));
var createStaffUserServer = createServerFn({ method: "POST" }).validator((input) => createStaffSchema.parse(input)).handler(createSsrRpc("5ddb5cc8c95b39c6c392ed7e3af86406511edad853e73662e1a3396064297bec"));
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
}).parse).handler(createSsrRpc("27213b8a016bd040457e2146591ef17d31c2e4bf8b5b73e394d272aeb120497d"));
var deleteStaffUserServer = createServerFn({ method: "POST" }).validator((input) => objectType({ userId: stringType() }).parse(input)).handler(createSsrRpc("a9e48184bc073159b7a2e7ceb44b9426ba01549379cb692ad1bc8e4dbbeec16d"));
var resetStaffPasswordServer = createServerFn({ method: "POST" }).validator((input) => objectType({
	userId: stringType(),
	newPassword: stringType().min(6)
}).parse(input)).handler(createSsrRpc("314a07cdc10e7d020d2c416f2a85c109cfa18bdb9a53c31159ffaea73fbb64ce"));
function useCurrentUser() {
	const [email, setEmail] = (0, import_react.useState)(null);
	const [userId, setUserId] = (0, import_react.useState)(null);
	const [isAdmin, setIsAdmin] = (0, import_react.useState)(false);
	const [isSuperAdmin, setIsSuperAdmin] = (0, import_react.useState)(false);
	const [permissions, setPermissions] = (0, import_react.useState)(defaultSuperAdminPermissions);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let active = true;
		(async () => {
			const { data } = await supabase.auth.getUser();
			if (!active) return;
			const user = data.user;
			const userEmail = user?.email ?? null;
			setEmail(userEmail);
			setUserId(user?.id ?? null);
			if (user) {
				if (userEmail === "anshsangani2007@gmail.com") {
					if (active) {
						setIsAdmin(true);
						setIsSuperAdmin(true);
						setPermissions(defaultSuperAdminPermissions);
						setLoading(false);
					}
					return;
				}
				try {
					const res = await getCurrentUserPermissionsServer({ data: {
						userId: user.id,
						email: userEmail ?? void 0
					} });
					if (active) {
						setIsAdmin(res.role === "admin" || res.role === "super_admin");
						setIsSuperAdmin(res.isSuperAdmin);
						setPermissions(res.permissions);
					}
				} catch {
					const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
					const hasAdmin = (roles ?? []).some((r) => r.role === "admin");
					if (active) {
						setIsAdmin(hasAdmin);
						setIsSuperAdmin(hasAdmin);
						setPermissions(hasAdmin ? defaultSuperAdminPermissions : defaultStaffPermissions);
					}
				}
			}
			if (active) setLoading(false);
		})();
		return () => {
			active = false;
		};
	}, []);
	return {
		email,
		userId,
		isAdmin,
		isSuperAdmin,
		roleTitle: isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Staff",
		permissions,
		loading
	};
}
//#endregion
export { deleteStaffUserServer as a, updateStaffPermissionsServer as c, defaultSuperAdminPermissions as i, useCurrentUser as l, defaultAdminPermissions as n, listStaffUsersServer as o, defaultStaffPermissions as r, resetStaffPasswordServer as s, createStaffUserServer as t };
