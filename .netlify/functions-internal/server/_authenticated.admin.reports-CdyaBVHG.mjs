import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-Cy02cvZt.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as Pencil, I as IndianRupee, L as Funnel, N as LoaderCircle, Q as Check, S as RotateCcw, T as Printer, V as Download, Y as ChevronUp, Z as ChevronDown, b as Search, nt as ArrowUpDown, r as Users, u as Trash2, w as Receipt, z as FileSpreadsheet } from "./_libs/lucide-react.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { i as createServerFn } from "./_ssr/server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./_ssr/createSsrRpc-humr6_nj.mjs";
import { l as stringType, o as numberType, s as objectType } from "./_libs/zod.mjs";
import { l as useCurrentUser } from "./_ssr/use-current-user-DaEVBLuH.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { t as Card } from "./_ssr/card-CzXpCsbD.mjs";
import { t as useServerFn } from "./_ssr/useServerFn-CrZF2pjq.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./_ssr/alert-dialog-Cyj8fg_M.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { t as Input } from "./_ssr/input-B8Q2ztVi.mjs";
import { t as Label } from "./_ssr/label-DBD1bRRP.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-CwLzEEob.mjs";
import { t as ReceiptSlip } from "./_ssr/ReceiptSlip-B8-os15y.mjs";
import { n as utils, r as writeFileSync } from "./_libs/xlsx.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "./_libs/@radix-ui/react-select+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated.admin.reports-CdyaBVHG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-10 w-full items-center justify-between whitespace-nowrap rounded-xl border border-[#d8c5af] bg-white px-3.5 py-2 text-sm text-[#4a1c14] font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#8b2500]/20 focus:border-[#8b2500] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 text-[#7c533f] opacity-70" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1 text-[#7c533f]", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1 text-[#7c533f]", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-[9999] max-h-72 min-w-[8rem] overflow-hidden rounded-2xl border border-[#d8c5af] bg-white text-[#4a1c14] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1.5", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2.5 py-1.5 text-xs font-bold text-[#7c533f] uppercase tracking-wider", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-3 pr-8 text-sm font-semibold text-[#4a1c14] outline-none transition-colors hover:bg-[#faf4eb] focus:bg-[#faf4eb] focus:text-[#8b2500] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-bold data-[state=checked]:text-[#8b2500] data-[state=checked]:bg-[#faf4eb]", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2.5 flex h-4 w-4 items-center justify-center text-[#8b2500]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 font-extrabold" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-[#e5d8c5]", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var updateTxSchema = objectType({
	id: stringType().uuid(),
	amount: numberType().min(0),
	service_name: stringType().min(1),
	student_name: stringType().optional(),
	suid: stringType().optional()
});
var deleteTxSchema = objectType({ id: stringType().uuid() });
var updateTransactionServer = createServerFn({ method: "POST" }).validator((input) => updateTxSchema.parse(input)).handler(createSsrRpc("7390cb5e079ed9d53059c1614100fd5014e1abce615641c73c19327164d86461"));
var deleteTransactionServer = createServerFn({ method: "POST" }).validator((input) => deleteTxSchema.parse(input)).handler(createSsrRpc("8785e5024b104cbacd7c107da1175a04e3e957f26cd2ad91e89b2bd01eb5406d"));
function isoDate(d) {
	return d.toISOString().slice(0, 10);
}
var QUICK_RANGES = [
	{
		key: "today",
		label: "Today"
	},
	{
		key: "7",
		label: "Last 7 Days"
	},
	{
		key: "30",
		label: "Last 30 Days"
	},
	{
		key: "month",
		label: "This Month"
	}
];
function ReportsPage() {
	const qc = useQueryClient();
	const { isSuperAdmin } = useCurrentUser();
	const updateTxFn = useServerFn(updateTransactionServer);
	const deleteTxFn = useServerFn(deleteTransactionServer);
	const [from, setFrom] = (0, import_react.useState)(isoDate(/* @__PURE__ */ new Date()));
	const [to, setTo] = (0, import_react.useState)(isoDate(/* @__PURE__ */ new Date()));
	const [service, setService] = (0, import_react.useState)("all");
	const [text, setText] = (0, import_react.useState)("");
	const [sortKey, setSortKey] = (0, import_react.useState)("date");
	const [asc, setAsc] = (0, import_react.useState)(false);
	const [printMode, setPrintMode] = (0, import_react.useState)("slip");
	const [activeReceipt, setActiveReceipt] = (0, import_react.useState)(null);
	const [kioskTitle, setKioskTitle] = (0, import_react.useState)("SHREE SWAMINARAYAN GURUKUL, RAJKOT");
	const [receiptFooter, setReceiptFooter] = (0, import_react.useState)("Jay Swaminarayan");
	const [editingRow, setEditingRow] = (0, import_react.useState)(null);
	const [editAmount, setEditAmount] = (0, import_react.useState)("");
	const [editService, setEditService] = (0, import_react.useState)("");
	const [deletingRow, setDeletingRow] = (0, import_react.useState)(null);
	useQuery({
		queryKey: ["settings-receipt"],
		queryFn: async () => {
			const { data } = await supabase.from("settings").select("key, value");
			if (data) {
				const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
				if (map["kiosk_title"]) setKioskTitle(map["kiosk_title"]);
				if (map["receipt_footer"]) setReceiptFooter(map["receipt_footer"]);
			}
			return data;
		}
	});
	const services = useQuery({
		queryKey: ["services-list"],
		queryFn: async () => {
			const { data, error } = await supabase.from("services").select("id, name").order("sort_order");
			if (error) throw error;
			return data;
		}
	});
	const report = useQuery({
		queryKey: [
			"report",
			from,
			to
		],
		queryFn: async () => {
			const start = /* @__PURE__ */ new Date(`${from}T00:00:00`);
			const end = /* @__PURE__ */ new Date(`${to}T23:59:59.999`);
			const { data, error } = await supabase.from("transactions").select("id, receipt_no, nfc_no, suid, student_name, service_name, amount, created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: false }).limit(5e3);
			if (error) throw error;
			return data;
		}
	});
	const editMutation = useMutation({
		mutationFn: async () => {
			if (!editingRow) return;
			const numAmount = Number(editAmount);
			if (isNaN(numAmount) || numAmount < 0) throw new Error("Please enter a valid amount");
			if (!editService.trim()) throw new Error("Please select a service name");
			await updateTxFn({ data: {
				id: editingRow.id,
				amount: numAmount,
				service_name: editService.trim()
			} });
		},
		onSuccess: () => {
			toast.success("Transaction updated successfully!");
			setEditingRow(null);
			qc.invalidateQueries({ queryKey: ["report"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (err) => {
			toast.error(err.message || "Failed to update transaction");
		}
	});
	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!deletingRow) return;
			await deleteTxFn({ data: { id: deletingRow.id } });
		},
		onSuccess: () => {
			toast.success("Transaction entry deleted successfully!");
			setDeletingRow(null);
			qc.invalidateQueries({ queryKey: ["report"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (err) => {
			toast.error(err.message || "Failed to delete transaction");
		}
	});
	function handlePrintReceipt(row) {
		setPrintMode("slip");
		const rData = {
			receiptNo: row.receipt_no,
			suid: row.suid,
			name: row.student_name,
			service: row.service_name,
			amount: Number(row.amount),
			at: row.created_at
		};
		setActiveReceipt(rData);
		toast.success(`Printing Receipt #${String(row.receipt_no).padStart(4, "0")} for ${row.student_name}`);
		setTimeout(() => {
			try {
				window.print();
			} catch (e) {
				console.error("Print trigger failed:", e);
			}
		}, 100);
	}
	function handlePrintFullReport() {
		if (rows.length === 0) {
			toast.error("No transactions to print for these filters");
			return;
		}
		setPrintMode("report");
		toast.success(`Printing Full Ledger Report (${rows.length} entries)`);
		setTimeout(() => {
			try {
				window.print();
			} catch (e) {
				console.error("Print trigger failed:", e);
			}
		}, 100);
	}
	function openEdit(row) {
		setEditingRow(row);
		setEditAmount(String(row.amount));
		setEditService(row.service_name);
	}
	function applyQuickRange(key) {
		const today = /* @__PURE__ */ new Date();
		if (key === "today") {
			setFrom(isoDate(today));
			setTo(isoDate(today));
			return;
		}
		if (key === "month") {
			setFrom(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
			setTo(isoDate(today));
			return;
		}
		const days = Number(key);
		const start = new Date(today);
		start.setDate(start.getDate() - (days - 1));
		setFrom(isoDate(start));
		setTo(isoDate(today));
	}
	function resetFilters() {
		setFrom(isoDate(/* @__PURE__ */ new Date()));
		setTo(isoDate(/* @__PURE__ */ new Date()));
		setService("all");
		setText("");
		setSortKey("date");
		setAsc(false);
	}
	const rows = (0, import_react.useMemo)(() => {
		const q = text.trim().toLowerCase();
		const filtered = (report.data ?? []).filter((r) => {
			if (service !== "all" && r.service_name !== service) return false;
			if (!q) return true;
			return r.student_name.toLowerCase().includes(q) || r.suid.toLowerCase().includes(q) || r.nfc_no && r.nfc_no.toLowerCase().includes(q) || String(r.receipt_no).includes(q);
		});
		const dir = asc ? 1 : -1;
		return [...filtered].sort((a, b) => {
			switch (sortKey) {
				case "name": return a.student_name.localeCompare(b.student_name) * dir;
				case "suid": return a.suid.localeCompare(b.suid) * dir;
				case "service": return a.service_name.localeCompare(b.service_name) * dir;
				case "amount": return (Number(a.amount) - Number(b.amount)) * dir;
				case "receipt": return (Number(a.receipt_no) - Number(b.receipt_no)) * dir;
				default: return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
			}
		});
	}, [
		report.data,
		service,
		text,
		sortKey,
		asc
	]);
	const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);
	const uniqueStudents = new Set(rows.map((r) => r.suid)).size;
	const avgAmount = rows.length > 0 ? (totalAmount / rows.length).toFixed(1) : "0";
	function exportExcel() {
		if (rows.length === 0) {
			toast.error("Nothing to export for these filters");
			return;
		}
		const ws = utils.json_to_sheet(rows.map((r) => ({
			"Receipt No": r.receipt_no,
			"Date": new Date(r.created_at).toLocaleDateString("en-IN"),
			"Time": new Date(r.created_at).toLocaleTimeString("en-IN"),
			"SUID": r.suid,
			"Student Name": r.student_name,
			"Service": r.service_name,
			"Amount (Rs)": Number(r.amount),
			"Card / NFC": r.nfc_no
		})));
		const wb = utils.book_new();
		utils.book_append_sheet(wb, ws, "Transactions");
		writeFileSync(wb, `Gurukul-Kiosk-Report-${from}-to-${to}.xlsx`);
		toast.success("Excel report exported successfully!");
	}
	function header(label, key) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
			className: "py-3 pr-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "inline-flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-[#7c533f] hover:text-[#4a1c14] transition-colors",
				onClick: () => {
					if (sortKey === key) setAsc(!asc);
					else {
						setSortKey(key);
						setAsc(true);
					}
				},
				children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpDown, { className: `size-3.5 ${sortKey === key ? "text-[#8b2500]" : "opacity-30"}` })]
			})
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 animate-in fade-in zoom-in-98 duration-300",
		children: [
			printMode === "slip" && activeReceipt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptSlip, {
				title: kioskTitle,
				receipt: activeReceipt,
				footerText: receiptFooter
			}),
			printMode === "report" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "print-report",
				className: "hidden print:block text-black p-6 font-sans",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center border-b-2 border-black pb-4 mb-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-xl font-bold uppercase tracking-wider",
								children: kioskTitle
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-gray-700 uppercase",
								children: "Cashless Service Transactions Ledger Report"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-gray-600 mt-1",
								children: [
									"Period: ",
									from,
									" to ",
									to,
									" | Total Entries: ",
									rows.length
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-4 gap-2 mb-4 border border-black p-3 text-center text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold block text-gray-600",
								children: "Total Revenue"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
								className: "text-sm",
								children: ["₹", totalAmount.toLocaleString("en-IN")]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold block text-gray-600",
								children: "Slips Generated"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-sm",
								children: rows.length
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold block text-gray-600",
								children: "Unique Students"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-sm",
								children: uniqueStudents
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold block text-gray-600",
								children: "Average Spend"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
								className: "text-sm",
								children: ["₹", avgAmount]
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b-2 border-black bg-gray-100 font-bold",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2",
										children: "Receipt #"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2",
										children: "Date & Time"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2",
										children: "SUID"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2",
										children: "Student Name"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2",
										children: "Service"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-2 text-right",
										children: "Amount (₹)"
									})
								]
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-gray-300",
								children: rows.map((r) => {
									const at = new Date(r.created_at);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-2 font-mono font-bold",
											children: ["#", String(r.receipt_no).padStart(5, "0")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-2",
											children: [
												at.toLocaleDateString("en-IN"),
												" ",
												at.toLocaleTimeString("en-IN", {
													hour: "2-digit",
													minute: "2-digit"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-2 font-mono",
											children: r.suid
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-2 font-semibold",
											children: r.student_name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-2",
											children: r.service_name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-2 text-right font-bold",
											children: ["₹", Number(r.amount).toFixed(2)]
										})
									] }, r.id);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tfoot", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t-2 border-black font-bold bg-gray-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									colSpan: 5,
									className: "py-2 px-2 text-right uppercase",
									children: "Total Filtered Amount:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "py-2 px-2 text-right text-sm",
									children: ["₹", totalAmount.toFixed(2)]
								})]
							}) })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 text-center text-xs border-t border-gray-400 pt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-bold",
							children: receiptFooter
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-gray-500 text-[10px] mt-0.5",
							children: ["Generated on ", (/* @__PURE__ */ new Date()).toLocaleString("en-IN")]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#e5d8c5] pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-3xl md:text-4xl font-serif font-bold text-[#4a1c14] tracking-tight flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "size-8 text-[#8b2500]" }), " Reports & Transactions Ledger"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-[#7c533f] font-medium",
					children: "Print full report summaries, reprint thermal receipts, edit or delete entries, and export to Excel."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: handlePrintFullReport,
						disabled: rows.length === 0,
						className: "btn-luxury-secondary px-5 py-2.5 text-xs gap-2 shadow-md disabled:opacity-50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-4 text-[#8b2500]" }),
							" Print Report (",
							rows.length,
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: exportExcel,
						disabled: rows.length === 0,
						className: "btn-luxury-primary px-6 py-2.5 text-xs gap-2 shadow-lg disabled:opacity-50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }),
							" Export Excel (",
							rows.length,
							")"
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-5 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-[#7c533f] uppercase",
									children: "Total Filtered Revenue"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "size-9 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndianRupee, { className: "size-4.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-3xl font-serif font-extrabold text-[#8b2500]",
								children: ["₹", totalAmount.toLocaleString("en-IN")]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-[#7c533f]",
								children: [
									from,
									" to ",
									to
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-5 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-[#7c533f] uppercase",
									children: "Slips Generated"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "size-9 rounded-2xl bg-blue-500/15 text-blue-700 border border-blue-500/30 flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "size-4.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-3xl font-serif font-extrabold text-blue-800",
								children: rows.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-[#7c533f]",
								children: "Total transactions"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-5 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-[#7c533f] uppercase",
									children: "Unique Students"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "size-9 rounded-2xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-3xl font-serif font-extrabold text-emerald-800",
								children: uniqueStudents
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-[#7c533f]",
								children: "Students availed services"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "card-luxury p-5 space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-[#7c533f] uppercase",
									children: "Average Ticket"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "size-9 rounded-2xl bg-purple-500/15 text-purple-700 border border-purple-500/30 flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndianRupee, { className: "size-4.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-3xl font-serif font-extrabold text-purple-800",
								children: ["₹", avgAmount]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-[#7c533f]",
								children: "Avg spend per slip"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "card-luxury p-6 md:p-8 space-y-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d8c5] pb-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm font-bold text-[#4a1c14] flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "size-4 text-[#8b2500]" }), " Query Filters"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: QUICK_RANGES.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => applyQuickRange(q.key),
							className: "px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#faf6ef] hover:bg-[#8b2500] hover:text-white border border-[#d8c5af] text-[#6b4a3a] transition-all",
							children: q.label
						}, q.key))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "from",
								className: "text-xs font-bold text-[#7c533f]",
								children: "From Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "from",
								type: "date",
								value: from,
								onChange: (e) => setFrom(e.target.value),
								className: "input-luxury h-10 text-xs font-mono font-semibold"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "to",
								className: "text-xs font-bold text-[#7c533f]",
								children: "To Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "to",
								type: "date",
								value: to,
								onChange: (e) => setTo(e.target.value),
								className: "input-luxury h-10 text-xs font-mono font-semibold"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-bold text-[#7c533f]",
								children: "Service"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: service,
								onValueChange: setService,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "input-luxury h-10 text-xs font-semibold",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "All services" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All services"
								}), (services.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s.name,
									children: s.name
								}, s.id))] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "q",
								className: "text-xs font-bold text-[#7c533f]",
								children: "Search Student / SUID"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 absolute left-3 top-3 text-[#7c533f]/50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "q",
									placeholder: "Search name, SUID, slip...",
									value: text,
									onChange: (e) => setText(e.target.value),
									className: "input-luxury h-10 pl-9 text-xs"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: resetFilters,
							className: "btn-luxury-secondary h-10 px-4 text-xs gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), " Reset Filters"]
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
								header("Receipt #", "receipt"),
								header("Date & Time", "date"),
								header("SUID", "suid"),
								header("Student Name", "name"),
								header("Service", "service"),
								header("Amount (₹)", "amount"),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-3 pl-4 text-right",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
							className: "divide-y divide-[#e5d8c5]/60 font-mono text-xs",
							children: [rows.map((r) => {
								const at = new Date(r.created_at);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "table-row-luxury hover:bg-[#faf4eb]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-bold text-[#4a1c14]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "px-2.5 py-1 rounded-lg bg-[#faf6ef] border border-[#d8c5af]",
												children: ["#", String(r.receipt_no).padStart(5, "0")]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-3.5 pr-4 text-[#7c533f]",
											children: [
												at.toLocaleDateString("en-IN"),
												", ",
												at.toLocaleTimeString("en-IN", {
													hour: "2-digit",
													minute: "2-digit",
													hour12: true
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-bold text-[#8b2500]",
											children: r.suid
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-sans font-bold text-sm text-[#2c1810]",
											children: r.student_name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pr-4 font-sans",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#faf6ef] text-[#4a1c14] border border-[#d8c5af]",
												children: r.service_name
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-3.5 pr-4 font-extrabold text-sm text-[#8b2500]",
											children: ["₹", Number(r.amount).toFixed(2)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3.5 pl-4 text-right font-sans",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-end gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														type: "button",
														title: "Reprint Thermal Receipt Slip",
														onClick: () => handlePrintReceipt(r),
														className: "btn-luxury-secondary px-3 py-1.5 text-xs gap-1.5 shadow-sm text-[#4a1c14] hover:text-[#8b2500]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-3.5 text-[#8b2500]" }), " Print"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														type: "button",
														title: "Edit Entry Amount/Service",
														onClick: () => openEdit(r),
														className: "btn-luxury-secondary px-3 py-1.5 text-xs gap-1.5 shadow-sm text-[#4a1c14]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-3.5 text-amber-700" }), " Edit"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														title: "Delete Transaction",
														onClick: () => setDeletingRow(r),
														className: "btn-luxury-danger px-2.5 py-1.5 text-xs shadow-sm",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
													})
												]
											})
										})
									]
								}, r.id);
							}), rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 7,
								className: "py-12 text-center text-sm text-[#7c533f] font-sans",
								children: "No transactions match the selected filters."
							}) })]
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editingRow !== null,
				onOpenChange: (open) => !open && setEditingRow(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-md bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6 md:p-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "text-2xl font-serif font-bold text-[#4a1c14] flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "size-6 text-[#8b2500]" }), " Edit Transaction Entry"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, {
						className: "text-xs text-[#7c533f]",
						children: [
							"Modify charged amount or service type for Receipt #",
							editingRow?.receipt_no,
							" (",
							editingRow?.student_name,
							")."
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "space-y-4 py-3",
						onSubmit: (e) => {
							e.preventDefault();
							editMutation.mutate();
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-bold text-[#7c533f]",
									children: "Student"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-[#faf6ef] border border-[#d8c5af] text-xs space-y-0.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-bold text-[#4a1c14]",
										children: editingRow?.student_name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-[#7c533f]",
										children: ["SUID: ", editingRow?.suid]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "edit-svc",
									className: "text-xs font-bold text-[#7c533f]",
									children: "Service Name *"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: editService,
									onValueChange: setEditService,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "input-luxury h-10 text-sm font-semibold",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select Service" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [(services.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: s.name,
										children: s.name
									}, s.id)), editingRow && !(services.data ?? []).some((s) => s.name === editingRow.service_name) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: editingRow.service_name,
										children: editingRow.service_name
									})] })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "edit-amt",
									className: "text-xs font-bold text-[#7c533f]",
									children: "Amount Charged (₹) *"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute left-3 top-2.5 text-xs font-bold text-[#7c533f]",
										children: "₹"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "edit-amt",
										type: "number",
										step: "0.01",
										min: "0",
										required: true,
										value: editAmount,
										onChange: (e) => setEditAmount(e.target.value),
										className: "input-luxury pl-8 h-10 font-mono font-bold text-sm"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "gap-2 pt-4 border-t border-[#e5d8c5]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setEditingRow(null),
									className: "btn-luxury-secondary px-5 py-2.5 text-xs",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "submit",
									disabled: editMutation.isPending,
									className: "btn-luxury-primary px-6 py-2.5 text-xs gap-2",
									children: [editMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Save Transaction Changes"]
								})]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: deletingRow !== null,
				onOpenChange: (open) => !open && setDeletingRow(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
					className: "bg-white border border-[#e5d8c5] shadow-2xl rounded-3xl p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, {
						className: "text-xl font-serif font-bold text-rose-700 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-5" }), " Delete Transaction Entry?"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, {
						className: "text-sm text-[#7c533f] space-y-2 pt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Are you sure you want to permanently delete ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["Receipt #", deletingRow?.receipt_no] }),
							" (₹",
							deletingRow?.amount,
							" - ",
							deletingRow?.service_name,
							") for ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: deletingRow?.student_name }),
							"?"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-rose-700 font-bold text-xs",
							children: "This transaction will be completely removed from the ledger and daily totals."
						})]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, {
						className: "gap-2 pt-4 border-t border-[#e5d8c5]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
							disabled: deleteMutation.isPending,
							className: "btn-luxury-secondary px-4 py-2 text-xs",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogAction, {
							disabled: deleteMutation.isPending,
							onClick: () => deleteMutation.mutate(),
							className: "btn-luxury-danger px-5 py-2 text-xs gap-2",
							children: [deleteMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Confirm Delete"]
						})]
					})]
				})
			})
		]
	});
}
//#endregion
export { ReportsPage as component };
