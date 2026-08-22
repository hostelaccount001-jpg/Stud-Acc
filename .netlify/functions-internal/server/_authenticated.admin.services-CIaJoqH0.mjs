import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $ as Calculator, E as Plus, g as ShoppingBag, u as Trash2 } from "./_libs/lucide-react.mjs";
import { l as useCurrentUser } from "./_ssr/use-current-user-DaEVBLuH.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Input } from "./_ssr/input-B8Q2ztVi.mjs";
import { t as Label } from "./_ssr/label-DBD1bRRP.mjs";
import { t as Switch } from "./_ssr/switch-g3PLolhL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.services-CIaJoqH0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ServicesPage() {
	const qc = useQueryClient();
	const { isAdmin } = useCurrentUser();
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		isCustomAmount: false,
		price: "50",
		print_receipt: true,
		daily_limit: ""
	});
	const services = useQuery({
		queryKey: ["services"],
		queryFn: async () => {
			const { data, error } = await supabase.from("services").select("*").order("sort_order");
			if (error) throw error;
			return data;
		}
	});
	const add = useMutation({
		mutationFn: async () => {
			const name = form.name.trim();
			const price = form.isCustomAmount ? 0 : Number(form.price);
			if (!name) throw new Error("Please enter service name");
			if (!form.isCustomAmount && (!Number.isFinite(price) || price <= 0)) throw new Error("Enter a valid fixed price greater than 0, or turn ON Custom Amount switch");
			const { error } = await supabase.from("services").insert({
				name,
				price,
				print_receipt: form.print_receipt,
				daily_limit: form.daily_limit ? Number(form.daily_limit) : null,
				active: true,
				sort_order: (services.data?.length ?? 0) + 1
			});
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Service created successfully!");
			setForm({
				name: "",
				isCustomAmount: false,
				price: "50",
				print_receipt: true,
				daily_limit: ""
			});
			qc.invalidateQueries({ queryKey: ["services"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const update = useMutation({
		mutationFn: async ({ id, patch }) => {
			const { error } = await supabase.from("services").update(patch).eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Service settings updated");
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["kiosk-config"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: async (id) => {
			const { error } = await supabase.from("services").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Service deleted");
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["kiosk-config"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const removeAll = useMutation({
		mutationFn: async () => {
			const { error } = await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("All services removed completely");
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["kiosk-config"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const restoreDefaults = useMutation({
		mutationFn: async () => {
			await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
			const { error } = await supabase.from("services").insert([
				{
					name: "Store",
					price: 0,
					print_receipt: true,
					active: true,
					sort_order: 1
				},
				{
					name: "Haircut",
					price: 50,
					print_receipt: true,
					active: true,
					sort_order: 2
				},
				{
					name: "Laundry",
					price: 20,
					print_receipt: false,
					active: true,
					sort_order: 3
				}
			]);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Default services (Store, Haircut, Laundry) restored!");
			qc.invalidateQueries({ queryKey: ["services"] });
			qc.invalidateQueries({ queryKey: ["kiosk-config"] });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-8 text-[#8b2500]" }), " Services & Pricing Controls"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: "Manage Gurukul store, haircut, laundry and other services. Toggle custom keypad entry or fixed price boxes."
				})] }), isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => restoreDefaults.mutate(),
						disabled: restoreDefaults.isPending,
						className: "btn-luxury-secondary px-4 py-2.5 text-xs gap-1.5",
						children: "Restore Defaults"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							if (window.confirm("Are you sure you want to delete ALL services from the database?")) removeAll.mutate();
						},
						disabled: removeAll.isPending || (services.data ?? []).length === 0,
						className: "btn-luxury-danger px-4 py-2.5 text-xs gap-1.5 disabled:opacity-50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }),
							" Delete All (",
							(services.data ?? []).length,
							")"
						]
					})]
				})]
			}),
			isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-[#e5d8c5] pb-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-lg font-serif font-bold text-[#4a1c14] flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5 text-[#8b2500]" }), " Add New Service"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-[#7c533f]",
						children: "Configure service name, custom keypad input or fixed amount, and print controls."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end",
					onSubmit: (e) => {
						e.preventDefault();
						add.mutate();
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "sname",
								className: "text-xs font-bold text-[#7c533f]",
								children: "Service Name *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "sname",
								placeholder: "e.g. Store, Haircut",
								value: form.name,
								onChange: (e) => setForm({
									...form,
									name: e.target.value
								}),
								required: true,
								className: "input-luxury h-10 text-sm font-semibold"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
									htmlFor: "scustom-toggle",
									className: "text-xs font-bold text-[#7c533f] flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "size-3.5 text-amber-700" }), " Custom Keypad"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex items-center gap-1.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										id: "scustom-toggle",
										checked: form.isCustomAmount,
										onCheckedChange: (v) => setForm({
											...form,
											isCustomAmount: v
										})
									})
								})]
							}), form.isCustomAmount ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 flex items-center gap-1.5 text-xs font-bold text-amber-800",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "size-3.5 shrink-0" }), " Student Touch Keypad"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "absolute left-3 top-2.5 text-xs font-bold text-[#7c533f]",
									children: "₹"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "sprice",
									type: "number",
									min: 1,
									step: "1",
									placeholder: "50",
									className: "input-luxury pl-7 h-10 font-bold font-mono text-sm",
									value: form.price,
									onChange: (e) => setForm({
										...form,
										price: e.target.value
									}),
									required: !form.isCustomAmount
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "slimit",
								className: "text-xs font-bold text-[#7c533f]",
								children: "Daily Cap (₹ optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "slimit",
								type: "number",
								min: 0,
								placeholder: "Unlimited",
								value: form.daily_limit,
								onChange: (e) => setForm({
									...form,
									daily_limit: e.target.value
								}),
								className: "input-luxury h-10 font-mono text-sm"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-bold text-[#7c533f]",
								children: "Print Thermal Receipt"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between h-10 px-3 rounded-xl border border-[#d8c5af] bg-white",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-[#4a1c14]",
									children: form.print_receipt ? "Print Receipt" : "Digital Only"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									id: "sprint",
									checked: form.print_receipt,
									onCheckedChange: (v) => setForm({
										...form,
										print_receipt: v
									})
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "submit",
							disabled: add.isPending,
							className: "btn-luxury-primary h-10 w-full text-xs gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " Add Service"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[#e5d8c5] text-left text-xs uppercase tracking-wider text-[#7c533f] font-bold",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Service"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4 text-center",
									children: "Custom Amount (Keypad)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Fixed Price (₹)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4",
									children: "Daily Cap"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4 text-center",
									children: "Print Receipt"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pr-4 text-center",
									children: "Active in Kiosk"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pl-4 text-right",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[#e5d8c5]/60 text-xs",
							children: (services.data ?? []).map((s) => {
								const isCustom = Number(s.price) === 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "table-row-luxury hover:bg-[#faf4eb]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 font-bold text-sm text-[#2c1810]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2.5 rounded-full bg-[#8b2500]" }), s.name]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "inline-flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: isCustom,
													disabled: !isAdmin,
													onCheckedChange: (checked) => {
														if (checked) update.mutate({
															id: s.id,
															patch: { price: 0 }
														});
														else update.mutate({
															id: s.id,
															patch: { price: 50 }
														});
													}
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[11px] font-bold px-2 py-0.5 rounded-full ${isCustom ? "bg-amber-500/15 text-amber-900 border border-amber-500/30" : "bg-[#faf6ef] text-[#7c533f] border border-[#d8c5af]"}`,
													children: isCustom ? "KEYPAD ON" : "FIXED PRICE"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 font-mono font-bold text-[#8b2500]",
											children: isCustom ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-500/30 font-sans text-xs font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "size-3" }), " Student Enters Amount"]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 max-w-[130px]",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs font-bold text-[#7c533f]",
													children: "₹"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													min: 1,
													step: "1",
													disabled: !isAdmin,
													defaultValue: s.price,
													onBlur: (e) => {
														const val = Number(e.target.value);
														if (val > 0 && val !== s.price) update.mutate({
															id: s.id,
															patch: { price: val }
														});
													},
													className: "input-luxury h-8 text-xs font-mono font-bold"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 font-mono",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "max-w-[120px]",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													min: 0,
													disabled: !isAdmin,
													defaultValue: s.daily_limit ?? "",
													placeholder: "Unlimited",
													onBlur: (e) => {
														const val = e.target.value ? Number(e.target.value) : null;
														if (val !== s.daily_limit) update.mutate({
															id: s.id,
															patch: { daily_limit: val }
														});
													},
													className: "input-luxury h-8 text-xs font-mono"
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "inline-flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: s.print_receipt ?? true,
													disabled: !isAdmin,
													onCheckedChange: (print_receipt) => update.mutate({
														id: s.id,
														patch: { print_receipt }
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${s.print_receipt !== false ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40" : "bg-zinc-200 text-zinc-700 border-zinc-300"}`,
													children: s.print_receipt !== false ? "PRINT ON" : "NO PRINT"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pr-4 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "inline-flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
													checked: s.active,
													disabled: !isAdmin,
													onCheckedChange: (active) => update.mutate({
														id: s.id,
														patch: { active }
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${s.active ? "bg-emerald-500/20 text-emerald-900 border-emerald-500/40" : "bg-rose-500/20 text-rose-900 border-rose-500/40"}`,
													children: s.active ? "ACTIVE" : "HIDDEN"
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-4 pl-4 text-right",
											children: isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => remove.mutate(s.id),
												className: "btn-luxury-danger px-3 py-1.5 text-xs gap-1",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
											})
										})
									]
								}, s.id);
							})
						})]
					})
				})
			})
		]
	});
}
//#endregion
export { ServicesPage as component };
