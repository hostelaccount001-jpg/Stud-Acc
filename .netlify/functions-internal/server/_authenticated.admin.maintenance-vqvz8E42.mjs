import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { N as LoaderCircle, Q as Check, S as RotateCcw, U as Database, _ as ShieldCheck, c as TriangleAlert, d as Square, f as SquareCheckBig, g as ShoppingBag, h as SlidersHorizontal, r as Users, u as Trash2, v as ShieldAlert, z as FileSpreadsheet } from "./_libs/lucide-react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { i as createServerFn } from "./_ssr/server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-humr6_nj.mjs";
import { r as booleanType, s as objectType } from "./_libs/zod.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { t as useServerFn } from "./_ssr/useServerFn-CrZF2pjq.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./_ssr/alert-dialog-Cyj8fg_M.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.maintenance-vqvz8E42.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
var formatSchema = objectType({
	formatStudents: booleanType().default(false),
	formatServices: booleanType().default(false),
	formatSettings: booleanType().default(false),
	formatReports: booleanType().default(false),
	formatStaffUsers: booleanType().default(false)
});
var executeErpFormatServer = createServerFn({ method: "POST" }).validator((input) => formatSchema.parse(input)).handler(createSsrRpc("fbb323801d5c674ff72e26f7f1a51c46c82b2dbcb36d971dea8df4df8e791400"));
function MaintenancePage() {
	const qc = useQueryClient();
	const executeFormatFn = useServerFn(executeErpFormatServer);
	const [formatStudents, setFormatStudents] = (0, import_react.useState)(false);
	const [formatServices, setFormatServices] = (0, import_react.useState)(false);
	const [formatSettings, setFormatSettings] = (0, import_react.useState)(false);
	const [formatReports, setFormatReports] = (0, import_react.useState)(true);
	const [formatStaffUsers, setFormatStaffUsers] = (0, import_react.useState)(false);
	const [confirmModalOpen, setConfirmModalOpen] = (0, import_react.useState)(false);
	const [isFullReset, setIsFullReset] = (0, import_react.useState)(false);
	const dbStats = useQuery({
		queryKey: ["db-stats-modules"],
		queryFn: async () => {
			const [tx, students, services, settings, profiles] = await Promise.all([
				supabase.from("transactions").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("students").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("services").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("settings").select("key", {
					count: "exact",
					head: true
				}),
				supabase.from("profiles").select("id", {
					count: "exact",
					head: true
				})
			]);
			return {
				transactions: tx.count ?? 0,
				students: students.count ?? 0,
				services: services.count ?? 0,
				settings: settings.count ?? 0,
				users: profiles.count ?? 1
			};
		}
	});
	const formatMutation = useMutation({
		mutationFn: async (opts) => {
			return await executeFormatFn({ data: opts });
		},
		onSuccess: (res) => {
			toast.success("Selected ERP Modules Formatted Successfully!");
			setConfirmModalOpen(false);
			qc.invalidateQueries();
		},
		onError: (err) => {
			toast.error(err.message || "Failed to format ERP modules");
		}
	});
	function selectAllModules() {
		setFormatStudents(true);
		setFormatServices(true);
		setFormatSettings(true);
		setFormatReports(true);
		setFormatStaffUsers(true);
	}
	function deselectAllModules() {
		setFormatStudents(false);
		setFormatServices(false);
		setFormatSettings(false);
		setFormatReports(false);
		setFormatStaffUsers(false);
	}
	function triggerSelectedFormat() {
		if (!formatStudents && !formatServices && !formatSettings && !formatReports && !formatStaffUsers) {
			toast.error("Please select at least one module to format");
			return;
		}
		setIsFullReset(false);
		setConfirmModalOpen(true);
	}
	function triggerFullReset() {
		setFormatStudents(true);
		setFormatServices(true);
		setFormatSettings(true);
		setFormatReports(true);
		setFormatStaffUsers(true);
		setIsFullReset(true);
		setConfirmModalOpen(true);
	}
	function handleConfirmExecute() {
		formatMutation.mutate({
			formatStudents,
			formatServices,
			formatSettings,
			formatReports,
			formatStaffUsers
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "size-8 text-[#8b2500]" }), " ERP Module Format & Reset Console"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: "Selectively format any individual module from the ERP sidebar, or execute a complete clean factory reset."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: triggerFullReset,
					className: "btn-luxury-danger px-6 py-2.5 text-xs gap-2 shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-4" }), " Full ERP Factory Format (Wipe All 5 Modules)"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-4 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold text-[#7c533f] uppercase",
									children: "Students"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4 text-blue-700" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-extrabold text-blue-800",
								children: dbStats.data?.students ?? 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-[#7c533f]",
								children: "Enrolled records"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-4 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold text-[#7c533f] uppercase",
									children: "Services"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-4 text-emerald-700" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-extrabold text-emerald-800",
								children: dbStats.data?.services ?? 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-[#7c533f]",
								children: "Active pricing"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-4 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold text-[#7c533f] uppercase",
									children: "Limits & Msgs"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-4 text-purple-700" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-extrabold text-purple-800",
								children: dbStats.data?.settings ?? 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-[#7c533f]",
								children: "Config keys"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-4 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold text-[#7c533f] uppercase",
									children: "Reports (Ledger)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "size-4 text-[#8b2500]" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-extrabold text-[#4a1c14]",
								children: dbStats.data?.transactions ?? 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-[#7c533f]",
								children: "Purchase slips"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-4 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold text-[#7c533f] uppercase",
									children: "Users & Roles"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4 text-amber-700" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-extrabold text-amber-800",
								children: dbStats.data?.users ?? 1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-[#7c533f]",
								children: "Staff accounts"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-xl font-serif font-bold text-[#4a1c14] flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-5 text-[#8b2500]" }), " Select ERP Modules to Format"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[#7c533f]",
							children: "Choose which module you want to wipe or reset. Only the checked modules will be formatted."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: selectAllModules,
								className: "btn-luxury-secondary px-3.5 py-1.5 text-xs gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { className: "size-3.5 text-[#8b2500]" }), " Select All"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: deselectAllModules,
								className: "btn-luxury-secondary px-3.5 py-1.5 text-xs gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5" }), " Deselect All"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 md:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => setFormatStudents(!formatStudents),
								className: `p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${formatStudents ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm" : "bg-white border-[#e5d8c5] text-[#7c533f]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: formatStudents,
									onCheckedChange: (c) => setFormatStudents(!!c),
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-sm text-[#4a1c14] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4 text-blue-700" }), " 1. Students Module"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]",
											children: [dbStats.data?.students ?? 0, " students"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-[#7c533f]",
										children: "Wipes all registered student names, SUIDs, NFC smart card mappings, and biometric fingerprints."
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => setFormatServices(!formatServices),
								className: `p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${formatServices ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm" : "bg-white border-[#e5d8c5] text-[#7c533f]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: formatServices,
									onCheckedChange: (c) => setFormatServices(!!c),
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-sm text-[#4a1c14] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-4 text-emerald-700" }), " 2. Services Module"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]",
											children: [dbStats.data?.services ?? 0, " services"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-[#7c533f]",
										children: "Wipes and deletes all services completely from database so you can add new custom services."
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => setFormatSettings(!formatSettings),
								className: `p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${formatSettings ? "bg-amber-500/10 border-amber-500/40 text-[#4a1c14] shadow-sm" : "bg-white border-[#e5d8c5] text-[#7c533f]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: formatSettings,
									onCheckedChange: (c) => setFormatSettings(!!c),
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-sm text-[#4a1c14] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-4 text-purple-700" }), " 3. Limits & Messages Module"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]",
											children: "Defaults"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-[#7c533f]",
										children: "Resets student daily spending limit (₹500), kiosk headers, and thermal receipt footer message to default."
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => setFormatReports(!formatReports),
								className: `p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${formatReports ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm" : "bg-white border-[#e5d8c5] text-[#7c533f]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: formatReports,
									onCheckedChange: (c) => setFormatReports(!!c),
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-sm text-[#4a1c14] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "size-4 text-[#8b2500]" }), " 4. Reports Module (Ledger)"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]",
											children: [dbStats.data?.transactions ?? 0, " rows"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-[#7c533f]",
										children: "Wipes all historical transaction slips and purchases. Resets daily and monthly revenue charts to ₹0."
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => setFormatStaffUsers(!formatStaffUsers),
								className: `p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 md:col-span-2 ${formatStaffUsers ? "bg-rose-500/10 border-rose-500/40 text-[#4a1c14] shadow-sm" : "bg-white border-[#e5d8c5] text-[#7c533f]"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: formatStaffUsers,
									onCheckedChange: (c) => setFormatStaffUsers(!!c),
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-sm text-[#4a1c14] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4 text-amber-700" }), " 5. Users & Roles Module"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#d8c5af]",
											children: [dbStats.data?.users ?? 1, " users"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-[#7c533f]",
										children: "Deletes all additional staff and admin accounts. (Primary Super Admin account remains safely preserved)."
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#e5d8c5]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-[#7c533f]",
							children: [
								"Selected for Format:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-[#8b2500]",
									children: [
										formatStudents && "1. Students",
										formatServices && "2. Services",
										formatSettings && "3. Limits & Messages",
										formatReports && "4. Reports",
										formatStaffUsers && "5. Users & Roles"
									].filter(Boolean).join(", ") || "None"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: triggerSelectedFormat,
							disabled: formatMutation.isPending || !formatStudents && !formatServices && !formatSettings && !formatReports && !formatStaffUsers,
							className: "btn-luxury-primary px-8 py-3 text-sm gap-2 disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), " Format Selected ERP Modules"]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: confirmModalOpen,
				onOpenChange: setConfirmModalOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
					className: "bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6 md:p-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
						className: "text-2xl font-serif font-bold text-rose-700 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-7 text-rose-600" }), isFullReset ? "Confirm Complete 5-Module ERP Format?" : "Confirm Selected ERP Modules Format?"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, {
						className: "text-sm text-[#7c533f] space-y-3 pt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "You are about to format the following modules:" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "list-disc pl-5 space-y-1 font-semibold text-[#4a1c14]",
								children: [
									formatStudents && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "👥 Students Module (All students, cards & fingerprints)" }),
									formatServices && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "🛠️ Services Module (All services & price lists)" }),
									formatSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "⚙️ Limits & Messages Module (Reset to factory defaults)" }),
									formatReports && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "📄 Reports Module (All transaction slips & revenue ledger)" }),
									formatStaffUsers && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "🛡️ Users & Roles Module (All staff accounts)" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-rose-700 font-bold",
								children: "⚠️ Warning: Once formatted, deleted records cannot be recovered!"
							})
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, {
						className: "gap-3 pt-6 border-t border-[#e5d8c5]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
							disabled: formatMutation.isPending,
							className: "btn-luxury-secondary px-5 py-2.5 text-xs",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
							disabled: formatMutation.isPending,
							onClick: handleConfirmExecute,
							className: "btn-luxury-danger px-6 py-2.5 text-xs gap-2",
							children: formatMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), " Formatting Modules..."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), " Yes, Format Selected Now"] })
						})]
					})]
				})
			})
		]
	});
}
//#endregion
export { MaintenancePage as component };
