import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ReceiptSlip-B8-os15y.js
var import_jsx_runtime = require_jsx_runtime();
function ReceiptSlip({ title = "SHREE SWAMINARAYAN GURUKUL, RAJKOT", receipt, footerText = "Jay Swaminarayan" }) {
	const at = new Date(receipt.at);
	const formattedNo = String(receipt.receiptNo);
	const dateStr = `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		id: "print-receipt",
		className: "hidden print:block text-black font-mono text-[12px] leading-relaxed mx-auto max-w-[72mm] p-2 bg-white",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					fontWeight: 800,
					fontSize: "13px",
					textTransform: "uppercase",
					lineHeight: 1.2,
					marginBottom: "3px"
				},
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					fontSize: "10px",
					color: "#444",
					letterSpacing: "0.5px",
					marginBottom: "6px"
				},
				children: "Cashless Service Receipt"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					color: "#666",
					fontSize: "11px",
					margin: "2px 0"
				},
				children: "----------------------------------------"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					margin: "3px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { color: "#222" },
					children: "Receipt No:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					style: { fontWeight: 800 },
					children: ["#", formattedNo]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					margin: "3px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { color: "#222" },
					children: "Date:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { fontWeight: 600 },
					children: dateStr
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					margin: "3px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { color: "#222" },
					children: "SUID:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { fontWeight: 800 },
					children: receipt.suid
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					margin: "3px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { color: "#222" },
					children: "Name:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: {
						fontWeight: 800,
						textTransform: "uppercase",
						textAlign: "right",
						maxWidth: "65%"
					},
					children: receipt.name
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					color: "#666",
					fontSize: "11px",
					margin: "4px 0"
				},
				children: "----------------------------------------"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					fontSize: "13px",
					fontWeight: 800,
					margin: "6px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [receipt.service, " / Service:"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Rs. ", receipt.amount.toFixed(2)] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					color: "#666",
					fontSize: "11px",
					margin: "4px 0"
				},
				children: "----------------------------------------"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					textAlign: "center",
					fontWeight: 800,
					fontSize: "12px",
					marginTop: "8px",
					marginBottom: "4px"
				},
				children: footerText
			})
		]
	});
}
//#endregion
export { ReceiptSlip as t };
