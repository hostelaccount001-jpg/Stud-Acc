import { i as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { B as Eye, N as LoaderCircle, h as SlidersHorizontal, w as Receipt, x as Save } from "./_libs/lucide-react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { i as createServerFn } from "./_ssr/server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-humr6_nj.mjs";
import { c as recordType, l as stringType, s as objectType } from "./_libs/zod.mjs";
import { l as useCurrentUser } from "./_ssr/use-current-user-DaEVBLuH.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { t as useServerFn } from "./_ssr/useServerFn-CrZF2pjq.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Input } from "./_ssr/input-B8Q2ztVi.mjs";
import { t as Label } from "./_ssr/label-DBD1bRRP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.settings-BvNJk3-7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var updateSettingsSchema = objectType({ settings: recordType(stringType(), stringType()) });
var getSettingsServer = createServerFn({ method: "GET" }).handler(createSsrRpc("ebb52917c35c248007f994cccb2ee14c4fd782aaee457a5d031c0ca04ceda6db"));
var updateSettingsServer = createServerFn({ method: "POST" }).validator((input) => updateSettingsSchema.parse(input)).handler(createSsrRpc("7432560bf7bc4326bb83290ab23b6f5f4cd85b37f5ca771c09426a3c1153eeb4"));
var FIELDS = [
	{
		key: "daily_limit",
		label: "Cumulative Daily Limit (₹)",
		hint: "Max amount a student can spend per day across all services. (0 = Unlimited)",
		placeholder: "500"
	},
	{
		key: "msg_success",
		label: "Success Message",
		hint: "Message shown on kiosk when transaction is approved.",
		multiline: true,
		placeholder: "Thank you! Your receipt has been generated."
	},
	{
		key: "msg_limit",
		label: "Limit Reached Warning Message",
		hint: "Message shown when a student exceeds their daily spend limit.",
		multiline: true,
		placeholder: "Today's limit is over. Please come tomorrow."
	},
	{
		key: "msg_blocked",
		label: "Card Blocked Message",
		hint: "Message shown when a blocked card is tapped.",
		multiline: true,
		placeholder: "Your card is temporarily blocked. Please contact the office."
	},
	{
		key: "kiosk_title",
		label: "Kiosk & Receipt Institution Name",
		hint: "Main institution name displayed at the top of the Kiosk and on the Thermal Receipt.",
		placeholder: "Shree Swaminarayan Gurukul, Rajkot"
	},
	{
		key: "kiosk_subtitle",
		label: "Kiosk Subtitle",
		hint: "Subtitle line displayed beneath the main heading.",
		placeholder: "Cashless Service Kiosk"
	},
	{
		key: "receipt_footer",
		label: "Receipt Footer Blessing / Note",
		hint: "Printed at the very bottom of the thermal receipt slip.",
		placeholder: "Jay Swaminarayan"
	}
];
function SettingsPage() {
	const qc = useQueryClient();
	const { isAdmin } = useCurrentUser();
	const [values, setValues] = (0, import_react.useState)({});
	const getSettings = useServerFn(getSettingsServer);
	const updateSettings = useServerFn(updateSettingsServer);
	const settings = useQuery({
		queryKey: ["settings"],
		queryFn: () => getSettings()
	});
	(0, import_react.useEffect)(() => {
		if (settings.data) setValues(settings.data);
	}, [settings.data]);
	const save = useMutation({
		mutationFn: async () => {
			await updateSettings({ data: { settings: values } });
		},
		onSuccess: () => {
			toast.success("Settings and messages saved successfully!");
			qc.invalidateQueries({ queryKey: ["settings"] });
			qc.invalidateQueries({ queryKey: ["kiosk-config"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const previewTitle = values["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
	const previewSubtitle = values["kiosk_subtitle"] || "Cashless Service Kiosk";
	const previewFooter = values["receipt_footer"] || "Jay Swaminarayan";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-8 text-[#8b2500]" }), " Limits & Messages Configuration"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: "Configure global spending caps, kiosk display headings, custom error messages, and receipt layout."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: !isAdmin || save.isPending,
					onClick: () => save.mutate(),
					className: "btn-luxury-primary px-8 py-3 text-sm gap-2",
					children: [save.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), "Save Changes"]
				})]
			}),
			!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "card-luxury border-amber-500/40 bg-amber-500/10 p-4 text-xs font-bold text-amber-900",
				children: "Only administrators can change these settings. You have read-only access."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-8 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "card-luxury p-6 md:p-8 lg:col-span-2 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-b border-[#e5d8c5] pb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-serif font-bold text-[#4a1c14]",
								children: "Kiosk Parameters & Message Templates"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#7c533f]",
								children: "Customize real-time terminal feedback and receipt texts"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-6 sm:grid-cols-2",
							children: FIELDS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: f.multiline ? "sm:col-span-2 space-y-1.5" : "space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: f.key,
										className: "text-xs font-bold text-[#7c533f]",
										children: f.label
									}),
									f.multiline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										id: f.key,
										rows: 2,
										maxLength: 300,
										disabled: !isAdmin,
										placeholder: f.placeholder,
										value: values[f.key] ?? "",
										onChange: (e) => setValues({
											...values,
											[f.key]: e.target.value
										}),
										className: "input-luxury resize-none text-sm"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: f.key,
										type: f.key === "daily_limit" ? "number" : "text",
										maxLength: 120,
										disabled: !isAdmin,
										placeholder: f.placeholder,
										value: values[f.key] ?? "",
										onChange: (e) => setValues({
											...values,
											[f.key]: e.target.value
										}),
										className: "input-luxury h-10 text-sm font-semibold"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-[#7c533f] font-medium",
										children: f.hint
									})
								]
							}, f.key))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-4 border-t border-[#e5d8c5] flex justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !isAdmin || save.isPending,
								onClick: () => save.mutate(),
								className: "btn-luxury-primary px-8 py-3 text-sm gap-2",
								children: [save.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), "Save All Settings"]
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-6 space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#7c533f]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4 text-[#8b2500]" }), " Kiosk Header Preview"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border-1.5 border-[#e5d8c5] bg-[#faf6ef] p-5 text-center text-[#2c1810] shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "font-serif font-bold text-lg text-[#4a1c14]",
								children: previewTitle
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-[#7c533f] mt-0.5",
								children: previewSubtitle
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-6 space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#7c533f]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "size-4 text-[#8b2500]" }), " Thermal Receipt Slip Preview"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border-2 border-dashed border-[#d8c5af] bg-white p-5 font-mono text-xs text-zinc-900 leading-tight space-y-1.5 shadow-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center font-bold uppercase text-[#4a1c14]",
									children: previewTitle
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center text-[10px] text-zinc-500",
									children: "Cashless Service Receipt"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center text-zinc-300",
									children: "--------------------------------"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Receipt No:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-[#8b2500]",
										children: "#1024"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Date:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN") })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SUID:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-[#8b2500]",
										children: "250392"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Name:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ZALODIYA DEEP" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center text-zinc-300",
									children: "--------------------------------"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between font-bold text-sm text-[#4a1c14]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Store / Service:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#8b2500]",
										children: "Rs. 50.00"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center text-zinc-300",
									children: "--------------------------------"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center font-bold mt-2 text-[#4a1c14]",
									children: previewFooter
								})
							]
						})]
					})]
				})]
			})
		]
	});
}
//#endregion
export { SettingsPage as component };
