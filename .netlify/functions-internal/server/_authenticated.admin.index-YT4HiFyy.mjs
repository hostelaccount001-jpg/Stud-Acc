import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { h as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { I as IndianRupee, K as Clock, et as Ban, g as ShoppingBag, it as Activity, l as TrendingUp, o as UserCheck, r as Users, tt as ArrowUpRight, w as Receipt } from "./_libs/lucide-react.mjs";
import { t as Button } from "./_ssr/button-BkEeRci-.mjs";
import { n as useQuery } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.index-YT4HiFyy.js
var import_jsx_runtime = require_jsx_runtime();
function startOfToday() {
	const d = /* @__PURE__ */ new Date();
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}
function Dashboard() {
	const { data, isLoading } = useQuery({
		queryKey: ["dashboard"],
		queryFn: async () => {
			const [tx, students, blocked] = await Promise.all([
				supabase.from("transactions").select("amount, service_name, student_name, suid, created_at, receipt_no").gte("created_at", startOfToday()).order("created_at", { ascending: false }),
				supabase.from("students").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("students").select("id", {
					count: "exact",
					head: true
				}).eq("blocked", true)
			]);
			const rows = tx.data ?? [];
			const byService = /* @__PURE__ */ new Map();
			for (const r of rows) {
				const cur = byService.get(r.service_name) ?? {
					count: 0,
					total: 0
				};
				byService.set(r.service_name, {
					count: cur.count + 1,
					total: cur.total + Number(r.amount)
				});
			}
			return {
				rows,
				total: rows.reduce((s, r) => s + Number(r.amount), 0),
				count: rows.length,
				students: students.count ?? 0,
				blocked: blocked.count ?? 0,
				byService: [...byService.entries()]
			};
		},
		refetchInterval: 15e3
	});
	const stats = [
		{
			label: "Today's Total Spend",
			value: `₹${(data?.total ?? 0).toLocaleString("en-IN")}`,
			subtitle: `${data?.count ?? 0} cashless transactions today`,
			icon: IndianRupee,
			gradient: "from-amber-500 to-rose-600",
			textGrad: "text-[#8b2500]"
		},
		{
			label: "Receipts Generated",
			value: String(data?.count ?? 0),
			subtitle: "Thermal printed slips",
			icon: Receipt,
			gradient: "from-blue-500 to-indigo-600",
			textGrad: "text-blue-700"
		},
		{
			label: "Registered Students",
			value: String(data?.students ?? 0),
			subtitle: "Enrolled in smart database",
			icon: Users,
			gradient: "from-emerald-500 to-teal-600",
			textGrad: "text-emerald-700"
		},
		{
			label: "Blocked Cards",
			value: String(data?.blocked ?? 0),
			subtitle: (data?.blocked ?? 0) === 0 ? "All cards active" : "Temporarily suspended",
			icon: Ban,
			gradient: "from-rose-500 to-red-600",
			textGrad: "text-rose-700"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight",
						children: "Executive Dashboard"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-emerald-500 animate-ping" }), " Live"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm font-medium text-[#7c533f]",
					children: ["Real-time analytics and cashless operations for ", (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric"
					})]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/admin/students",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "outline",
							className: "rounded-xl border-[#d8c5af] text-[#6b4a3a]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserCheck, { className: "size-4 mr-1.5" }), " Enrol Student"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/admin/reports",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							className: "rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] text-white shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "size-4 mr-1.5" }), " Full Reports"]
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
				children: stats.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-6 bg-white/90 backdrop-blur-md border-2 border-[#e5d8c5] hover:border-[#8b2500]/40 shadow-xl rounded-3xl transition-all duration-300 hover:-translate-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold text-[#7c533f] uppercase tracking-wider",
								children: s.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `size-10 rounded-2xl bg-gradient-to-tr ${s.gradient} flex items-center justify-center text-white shadow-md`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "size-5" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `mt-4 text-3xl md:text-4xl font-serif font-extrabold ${s.textGrad}`,
							children: s.value
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-[#8f6853] font-medium",
							children: s.subtitle
						})
					]
				}, s.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-8 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-6 bg-white/90 backdrop-blur-md border border-[#e5d8c5] shadow-xl rounded-3xl lg:col-span-1 space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center justify-between border-b border-[#e5d8c5] pb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-5 text-[#8b2500]" }), " Today by Service"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[#7c533f]",
							children: "Breakdown of store and campus services"
						})] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [(data?.byService ?? []).map(([name, v]) => {
							const pct = (data?.total ?? 0) > 0 ? Math.round(v.total / (data?.total ?? 1) * 100) : 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-[#faf6ef] border border-[#e5d8c5] space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-[#4a1c14]",
											children: name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono font-extrabold text-[#8b2500]",
											children: ["₹", v.total.toLocaleString("en-IN")]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs text-[#7c533f]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [v.count, " slips issued"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [pct, "% share"] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-2 w-full rounded-full bg-[#ebdcc8] overflow-hidden",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-full bg-gradient-to-r from-[#8b2500] to-amber-600 rounded-full transition-all duration-500",
											style: { width: `${Math.max(5, pct)}%` }
										})
									})
								]
							}, name);
						}), (data?.byService ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-12 text-center text-[#7c533f] text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-8 mx-auto text-[#c5a880] mb-2 animate-pulse" }), "No transactions recorded yet today."]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-6 bg-white/90 backdrop-blur-md border border-[#e5d8c5] shadow-xl rounded-3xl lg:col-span-2 space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-b border-[#e5d8c5] pb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "size-5 text-emerald-600" }), " Recent Live Transactions"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[#7c533f]",
							children: "Latest cashless entries processed at terminal"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/admin/reports",
							className: "text-xs font-bold text-[#8b2500] hover:underline flex items-center gap-1",
							children: ["View All ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3" })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2.5 overflow-hidden",
						children: [(data?.rows ?? []).slice(0, 8).map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between p-3.5 rounded-2xl bg-[#faf6ef] hover:bg-[#f5ecdf] border border-[#e5d8c5] transition-all",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "size-10 rounded-2xl bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center justify-center font-bold text-sm",
									children: r.student_name?.[0]?.toUpperCase() ?? "S"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-bold text-[#4a1c14] text-sm",
										children: r.student_name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#d8c5af] text-[#7c533f]",
										children: ["#", String(r.receipt_no ?? "").padStart(4, "0")]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-[#7c533f] font-mono mt-0.5",
									children: [
										"SUID: ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-[#4a1c14]",
											children: r.suid
										}),
										" • ",
										r.service_name
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-base font-extrabold text-[#8b2500] font-mono",
									children: ["₹", Number(r.amount).toFixed(2)]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] text-[#7c533f] font-mono",
									children: new Date(r.created_at).toLocaleTimeString("en-IN", {
										hour: "2-digit",
										minute: "2-digit",
										hour12: true
									})
								})]
							})]
						}, i)), (data?.rows ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-12 text-center text-[#7c533f] text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "size-8 mx-auto text-[#c5a880] mb-2 animate-pulse" }), "No transactions completed yet today."]
						})]
					})]
				})]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
