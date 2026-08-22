import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { d as Outlet, g as useNavigate, h as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { O as Monitor, P as LayoutDashboard, U as Database, X as ChevronRight, _ as ShieldCheck, h as SlidersHorizontal, j as LogOut, k as Menu, n as Wrench, p as Sparkles, r as Users, t as X, z as FileSpreadsheet } from "./_libs/lucide-react.mjs";
import { t as Button } from "./_ssr/button-BkEeRci-.mjs";
import { l as useCurrentUser } from "./_ssr/use-current-user-DaEVBLuH.mjs";
import { i as useQueryClient } from "./_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin-CbjU8wc8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var nav = [
	{
		to: "/admin",
		label: "Dashboard",
		icon: LayoutDashboard,
		exact: true,
		desc: "Live overview & transactions"
	},
	{
		to: "/admin/students",
		label: "Students",
		icon: Users,
		desc: "Biometric enrollment & cards"
	},
	{
		to: "/admin/services",
		label: "Services",
		icon: Wrench,
		desc: "Pricing & receipt controls"
	},
	{
		to: "/admin/settings",
		label: "Limits & Messages",
		icon: SlidersHorizontal,
		desc: "Daily cap & kiosk headers"
	},
	{
		to: "/admin/reports",
		label: "Reports",
		icon: FileSpreadsheet,
		desc: "Excel exports & analytics"
	},
	{
		to: "/admin/staff",
		label: "Users & Roles",
		icon: ShieldCheck,
		desc: "Super Admin user manager"
	},
	{
		to: "/admin/maintenance",
		label: "Format ERP & DB",
		icon: Database,
		desc: "Database reset & wipe tools"
	}
];
function AdminLayout() {
	const { email, roleTitle, permissions, isSuperAdmin } = useCurrentUser();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [mobileMenuOpen, setMobileMenuOpen] = (0, import_react.useState)(false);
	const [time, setTime] = (0, import_react.useState)((/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", {
		hour: "2-digit",
		minute: "2-digit"
	}));
	(0, import_react.useEffect)(() => {
		const timer = setInterval(() => {
			setTime((/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", {
				hour: "2-digit",
				minute: "2-digit"
			}));
		}, 1e4);
		return () => clearInterval(timer);
	}, []);
	const visibleNav = nav.filter((item) => {
		if (item.to === "/admin") return permissions.dashboard !== false;
		if (item.to === "/admin/students") return permissions.students;
		if (item.to === "/admin/services") return permissions.services;
		if (item.to === "/admin/settings") return permissions.settings;
		if (item.to === "/admin/reports") return permissions.reports;
		if (item.to === "/admin/staff") return permissions.users || isSuperAdmin;
		if (item.to === "/admin/maintenance") return isSuperAdmin || permissions.settings;
		return true;
	});
	async function signOut() {
		await queryClient.cancelQueries();
		queryClient.clear();
		await supabase.auth.signOut();
		navigate({
			to: "/auth",
			replace: true
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen bg-[#faf6ef] text-[#2c1810] font-sans antialiased",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden lg:flex w-72 shrink-0 flex-col bg-gradient-to-b from-[#2c1810] via-[#3a1d14] to-[#1e100b] p-6 text-white shadow-2xl relative border-r border-white/10 select-none",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-1 pb-6 border-b border-white/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "size-11 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-500 flex items-center justify-center shadow-lg border border-amber-400/30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-6 text-white" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300",
								children: "Gurukul ERP"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-serif font-extrabold tracking-tight text-white leading-tight",
								children: "Admin Console"
							})] })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto",
						children: visibleNav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							activeOptions: { exact: "exact" in item },
							className: "group flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white",
							activeProps: { className: "flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#8b2500] to-amber-700 text-white font-bold shadow-lg shadow-[#8b2500]/30 border border-amber-400/30" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-4.5 transition-transform group-hover:scale-110" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" })]
						}, item.to))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 space-y-3 border-t border-white/10 pt-4 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] font-medium text-white/50",
											children: "Logged in user:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] font-bold text-amber-300 font-mono",
											children: time
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-white font-mono text-xs font-semibold",
										children: email
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-2.5" }),
											" ",
											roleTitle
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/",
								className: "flex items-center justify-center gap-2 rounded-xl py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all shadow-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, { className: "size-3.5 text-amber-300" }), " Open Kiosk Terminal"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								className: "w-full text-white/80 hover:text-white hover:bg-rose-500/20 text-xs font-semibold rounded-xl",
								onClick: signOut,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-3.5 mr-2 text-rose-400" }), " Sign Out"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lg:hidden fixed top-0 inset-x-0 z-40 bg-[#2c1810] text-white p-4 flex items-center justify-between shadow-lg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "size-8 rounded-xl bg-gradient-to-tr from-[#8b2500] to-amber-500 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4 text-white" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-serif font-bold text-sm",
						children: "Gurukul Admin"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setMobileMenuOpen(!mobileMenuOpen),
					className: "p-2 rounded-xl bg-white/10 text-white hover:bg-white/20",
					children: mobileMenuOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
				})]
			}),
			mobileMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lg:hidden fixed inset-0 z-30 bg-[#2c1810]/95 backdrop-blur-xl p-6 pt-20 flex flex-col justify-between text-white animate-in fade-in duration-200",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex flex-col gap-2",
					children: visibleNav.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						onClick: () => setMobileMenuOpen(false),
						className: "flex items-center gap-3 p-3.5 rounded-2xl text-base font-semibold text-white/80 hover:bg-white/10",
						activeProps: { className: "flex items-center gap-3 p-3.5 rounded-2xl text-base font-bold bg-[#8b2500] text-white" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-5" }), item.label]
					}, item.to))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 pt-6 border-t border-white/10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						onClick: () => setMobileMenuOpen(false),
						className: "flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 text-white font-bold text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, { className: "size-4" }), " Open Kiosk Terminal"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "destructive",
						className: "w-full rounded-2xl",
						onClick: signOut,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4 mr-2" }), " Sign Out"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 overflow-x-auto p-6 md:p-10 pt-20 lg:pt-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
			})
		]
	});
}
//#endregion
export { AdminLayout as component };
