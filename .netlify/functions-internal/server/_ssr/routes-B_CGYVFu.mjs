import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { $ as Calculator, C as RefreshCw, G as CreditCard, H as Delete, J as CircleAlert, N as LoaderCircle, R as FingerprintPattern, T as Printer, _ as ShieldCheck, q as CircleCheck, y as Settings } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { i as createServerFn } from "./server-DxD86aHG.mjs";
import { t as createSsrRpc } from "./createSsrRpc-humr6_nj.mjs";
import { l as stringType, o as numberType, s as objectType } from "../_libs/zod.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { t as useServerFn } from "./useServerFn-CrZF2pjq.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CwLzEEob.mjs";
import { t as ReceiptSlip } from "./ReceiptSlip-B8-os15y.mjs";
import { t as captureFinger } from "./mantra-DG5I9wM5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B_CGYVFu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
var getKioskConfig = createServerFn({ method: "GET" }).handler(createSsrRpc("55889a0ec6983e008fe30c8e23cfd74f10f2b3365df30614a27ac071ae6921cf"));
var identifyStudentByFingerprint = createServerFn({ method: "POST" }).validator((input) => identifySchema.parse(input)).handler(createSsrRpc("96ed57dfbe2d4a0a4b43cf5dad9a7a363a9d5d3a756e6014a54c7ed2e41aeb08"));
var lookupStudent = createServerFn({ method: "POST" }).validator((input) => nfcSchema.parse(input)).handler(createSsrRpc("1d5a1e810a97b067bedbb2be20989f9eb403e34bf9ac70e2d432b14825fa6220"));
var punchService = createServerFn({ method: "POST" }).validator((input) => punchSchema.parse(input)).handler(createSsrRpc("5abd70b1ff23239a01bb372fe347698a0bd6e55d385dca58a4f3fb58ae60f7b7"));
function Kiosk() {
	const [step, setStep] = (0, import_react.useState)("finger");
	const [capturedScan, setCapturedScan] = (0, import_react.useState)(null);
	const [detectedStudent, setDetectedStudent] = (0, import_react.useState)(null);
	const [student, setStudent] = (0, import_react.useState)(null);
	const [nfc, setNfc] = (0, import_react.useState)("");
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [successBanner, setSuccessBanner] = (0, import_react.useState)(null);
	const [activeReceipt, setActiveReceipt] = (0, import_react.useState)(null);
	const [customService, setCustomService] = (0, import_react.useState)(null);
	const [customAmountStr, setCustomAmountStr] = (0, import_react.useState)("0");
	const cardInputRef = (0, import_react.useRef)(null);
	const getConfig = useServerFn(getKioskConfig);
	const identifyFn = useServerFn(identifyStudentByFingerprint);
	const lookup = useServerFn(lookupStudent);
	const punch = useServerFn(punchService);
	const config = useQuery({
		queryKey: ["kiosk-config"],
		queryFn: () => getConfig(),
		refetchInterval: 3e4
	});
	const title = config.data?.settings["kiosk_title"] || "Shree Swaminarayan Gurukul, Rajkot";
	const subtitle = config.data?.settings["kiosk_subtitle"] || "Cashless Service Kiosk";
	const footerText = config.data?.settings["receipt_footer"] || "Jay Swaminarayan";
	(0, import_react.useEffect)(() => {
		if (step === "card") {
			const t = setTimeout(() => cardInputRef.current?.focus(), 150);
			return () => clearTimeout(t);
		}
	}, [step]);
	(0, import_react.useEffect)(() => {
		if (successBanner) {
			const t = setTimeout(() => setSuccessBanner(null), 5e3);
			return () => clearTimeout(t);
		}
	}, [successBanner]);
	function reset() {
		setStep("finger");
		setCapturedScan(null);
		setDetectedStudent(null);
		setStudent(null);
		setNfc("");
		setError("");
		setCustomService(null);
		setCustomAmountStr("0");
	}
	async function startFingerScan() {
		setScanning(true);
		setError("");
		setSuccessBanner(null);
		try {
			const capture = await captureFinger(60, 10);
			if (!capture.ok) {
				setError(capture.error);
				return;
			}
			const ident = await identifyFn({ data: {
				probeTemplate: capture.template,
				quality: capture.quality
			} });
			if (ident.status === "not_found") {
				setError("Fingerprint not recognized. Please enroll your fingerprint in the Admin Portal first.");
				return;
			}
			setDetectedStudent({
				studentId: ident.studentId,
				suid: ident.suid,
				name: ident.name,
				nfc_no: ident.nfc_no,
				class_name: ident.class_name,
				room_no: ident.room_no
			});
			setCapturedScan({
				template: capture.template,
				quality: capture.quality,
				serial: capture.serial,
				at: (/* @__PURE__ */ new Date()).toISOString()
			});
			setStep("card");
		} catch {
			setError("Biometric communication error. Please place your finger firmly on the Mantra sensor and try again.");
		} finally {
			setScanning(false);
		}
	}
	async function submitCard(value) {
		const code = value.trim();
		if (!code) return;
		if (!detectedStudent) {
			setError("Please scan your fingerprint on the Mantra sensor in Step 1 first.");
			setStep("finger");
			return;
		}
		if (code !== detectedStudent.nfc_no) {
			setError("Card does not match the scanned fingerprint! Please tap your own registered card.");
			setNfc("");
			return;
		}
		setBusy(true);
		setError("");
		try {
			const res = await lookup({ data: { nfc: code } });
			if (res.status === "not_found") {
				setError("NFC card is not registered in the system. Please contact the office.");
				setNfc("");
				return;
			}
			if (res.status === "blocked") {
				setError(`Card Blocked: ${res.message}`);
				setNfc("");
				return;
			}
			if (res.status === "no_fingerprint") {
				setError(res.message);
				setNfc("");
				return;
			}
			setStudent(detectedStudent);
			setStep("service");
		} catch {
			setError("Terminal verification error. Please try tapping your card again.");
		} finally {
			setBusy(false);
		}
	}
	function handleServiceClick(service) {
		if (service.price === 0) {
			setCustomService(service);
			setCustomAmountStr("0");
		} else executePunch(service.id, service.price);
	}
	async function executePunch(serviceId, amount) {
		if (!student) return;
		setBusy(true);
		setError("");
		const studentName = student.name;
		const studentNfc = student.nfc_no;
		try {
			const res = await punch({ data: {
				nfc: studentNfc,
				serviceId,
				customAmount: amount && amount > 0 ? amount : void 0
			} });
			if (res.status === "ok") {
				if (res.print && res.receipt) {
					setActiveReceipt(res.receipt);
					setTimeout(() => {
						try {
							window.print();
						} catch (e) {
							console.error("Print trigger failed:", e);
						}
					}, 80);
				}
				setSuccessBanner(`✅ Paid ₹${res.receipt?.amount ?? amount} for ${res.receipt?.service}! Receipt printed for ${studentName}.`);
				reset();
			} else if (res.status === "blocked") setError(res.message);
			else if (res.status === "limit") setError(res.message);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to process service transaction");
		} finally {
			setBusy(false);
		}
	}
	function handleKeypadDigit(digit) {
		if (customAmountStr === "0") setCustomAmountStr(digit);
		else if (customAmountStr.length < 5) setCustomAmountStr(customAmountStr + digit);
	}
	function handleKeypadBackspace() {
		if (customAmountStr.length <= 1) setCustomAmountStr("0");
		else setCustomAmountStr(customAmountStr.slice(0, -1));
	}
	function handleKeypadClear() {
		setCustomAmountStr("0");
	}
	function handleAddChipAmount(add) {
		const current = Number(customAmountStr) || 0;
		const next = Math.min(1e4, current + add);
		setCustomAmountStr(String(next));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-[#faf6ef] text-[#2c1810] flex flex-col justify-between p-6 md:p-10 font-sans select-none",
		children: [
			activeReceipt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptSlip, {
				title,
				footerText,
				receipt: activeReceipt
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "relative text-center space-y-2 py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/admin",
						className: "absolute right-0 top-0 inline-flex items-center gap-2 rounded-full border border-[#e5d8c5] bg-white/80 px-4 py-2 text-xs font-semibold text-[#6b4a3a] shadow-sm transition-all hover:bg-white hover:text-[#2c1810]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" }), " Admin Portal"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl md:text-5xl font-serif font-bold tracking-tight text-[#4a1c14] drop-shadow-sm",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm md:text-base font-medium text-[#7c533f] tracking-wide",
						children: subtitle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-center gap-2 pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${step === "finger" ? "bg-[#4a1c14] text-white shadow-md scale-105" : capturedScan ? "bg-emerald-600/15 text-emerald-800 border border-emerald-500/30" : "bg-[#ebdcc8] text-[#7c533f]"}`,
								children: [capturedScan ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-3.5" }) : null, " 1. Fingerprint"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#c5a880]",
								children: "——"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${step === "card" ? "bg-[#4a1c14] text-white shadow-md scale-105" : student ? "bg-emerald-600/15 text-emerald-800 border border-emerald-500/30" : "bg-[#ebdcc8] text-[#7c533f]"}`,
								children: [student ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-3.5" }) : null, " 2. NFC Card"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#c5a880]",
								children: "——"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${step === "service" ? "bg-[#4a1c14] text-white shadow-md scale-105" : "bg-[#ebdcc8] text-[#7c533f]"}`,
								children: "3. Service"
							})
						]
					})
				]
			}),
			successBanner && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-xl mx-auto w-full p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-center gap-3 text-center text-sm md:text-base font-bold animate-in fade-in slide-in-from-top-4 duration-300",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-6 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: successBanner })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex-1 flex items-center justify-center my-4",
				children: [
					step === "finger" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "w-full max-w-xl p-8 md:p-12 text-center bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-2xl rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative mx-auto size-32 rounded-full bg-[#fdf8f0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: `size-16 text-[#8b2500] transition-all duration-300 ${scanning ? "animate-pulse scale-110 text-rose-600" : ""}` }), scanning && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-full border-4 border-rose-500 animate-ping opacity-30" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]",
									children: "Step 1: Scan Your Fingerprint"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm md:text-base text-[#7c533f]",
									children: scanning ? "Place your finger firmly on the Mantra scanner sensor now..." : "Touch the sensor on the Mantra scanner to identify your student account."
								})]
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "size-5 shrink-0 text-rose-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "lg",
								onClick: startFingerScan,
								disabled: scanning,
								className: "w-full h-14 text-base font-semibold bg-[#4a1c14] hover:bg-[#6b2c1a] text-white rounded-2xl shadow-lg transition-transform active:scale-[0.98]",
								children: scanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-5 animate-spin mr-2" }), "Scanning finger on Mantra MFS110..."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FingerprintPattern, { className: "size-5 mr-2" }), "Touch to Scan Fingerprint"] })
							})
						]
					}),
					step === "card" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "w-full max-w-xl p-8 md:p-12 text-center bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-2xl rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300",
						children: [
							capturedScan && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Fingerprint Verified on Mantra MFS110 (Quality: ",
									capturedScan.quality,
									"%)"
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mx-auto size-28 rounded-full bg-[#fdf8f0] border-2 border-dashed border-[#b87333] flex items-center justify-center shadow-inner",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "size-14 text-[#8b2500] animate-bounce" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl md:text-3xl font-serif font-bold text-[#4a1c14]",
									children: "Step 2: Tap Your NFC Card"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm md:text-base text-[#7c533f]",
									children: "Place your smart card on the card reader to open your account."
								})]
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "size-5 shrink-0 text-rose-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: (e) => {
									e.preventDefault();
									submitCard(nfc);
								},
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									ref: cardInputRef,
									type: "text",
									autoFocus: true,
									disabled: busy,
									placeholder: "Tap card on reader or enter card no...",
									value: nfc,
									onChange: (e) => {
										const val = e.target.value;
										setNfc(val);
										if (val.trim().length >= 8) submitCard(val);
									},
									className: "h-14 text-center font-mono text-lg font-bold bg-[#fdfbf7] border-[#d8c5af] rounded-2xl focus-visible:ring-[#8b2500]"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										type: "button",
										variant: "outline",
										onClick: reset,
										className: "flex-1 h-12 rounded-xl border-[#d8c5af] text-[#6b4a3a]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "size-4 mr-2" }), " Start Over"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "submit",
										disabled: busy || !nfc.trim(),
										className: "flex-1 h-12 font-semibold bg-[#4a1c14] hover:bg-[#6b2c1a] text-white rounded-xl",
										children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-2" }) : "Verify Card"
									})]
								})]
							})
						]
					}),
					step === "service" && student && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-4xl space-y-6 animate-in fade-in zoom-in-95 duration-300",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
								className: "p-5 bg-white/90 backdrop-blur-sm border-[#e5d8c5] shadow-lg rounded-2xl flex flex-wrap items-center justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 flex items-center justify-center font-serif font-bold text-xl",
										children: student.name[0]?.toUpperCase()
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-xl font-bold text-[#4a1c14]",
											children: student.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/15 text-emerald-800 border border-emerald-500/30",
											children: "Verified"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs font-mono text-[#7c533f] mt-0.5",
										children: [
											"SUID: ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-bold text-[#4a1c14]",
												children: student.suid
											}),
											student.class_name ? ` • Class: ${student.class_name}` : ""
										]
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									onClick: reset,
									className: "rounded-xl border-[#d8c5af] text-[#6b4a3a] hover:bg-[#f5ecdf]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "size-4 mr-1.5" }), " Cancel / Exit"]
								})]
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "size-5 shrink-0 text-rose-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6",
								children: (config.data?.services ?? []).map((service) => {
									const isCustom = service.price === 0;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
										onClick: () => !busy && handleServiceClick(service),
										className: "group relative cursor-pointer overflow-hidden p-8 text-center bg-white/90 backdrop-blur-sm border-2 border-[#e5d8c5] hover:border-[#8b2500] shadow-xl hover:shadow-2xl rounded-3xl transition-all duration-200 hover:-translate-y-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mx-auto size-20 rounded-full bg-[#fdf8f0] group-hover:bg-[#f7ece0] border border-[#e5d8c5] flex items-center justify-center mb-4 transition-colors",
												children: isCustom ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "size-9 text-[#8b2500]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-9 text-[#8b2500]" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
												className: "text-2xl font-serif font-bold text-[#4a1c14] group-hover:text-[#8b2500]",
												children: service.name
											}),
											isCustom ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30",
													children: "Custom Amount"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-lg font-bold text-[#8b2500] mt-1",
													children: "Touch to Enter ₹"
												})]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-3 text-3xl font-extrabold text-[#8b2500]",
												children: ["₹", service.price]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-[#7c533f] mt-2 font-medium",
												children: service.print_receipt ? "Prints thermal receipt" : "Digital transaction"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												size: "lg",
												disabled: busy,
												className: "w-full mt-6 bg-[#4a1c14] group-hover:bg-[#8b2500] text-white font-bold rounded-xl shadow-md",
												children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-2" }) : isCustom ? "Enter Amount" : "Select & Pay ₹" + service.price
											})
										]
									}, service.id);
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: customService !== null,
				onOpenChange: (open) => !open && setCustomService(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "sm:max-w-md p-6 bg-white rounded-3xl border-[#e5d8c5] shadow-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
							className: "text-center space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
								className: "text-2xl font-serif font-bold text-[#4a1c14] flex items-center justify-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "size-6 text-[#8b2500]" }),
									customService?.name,
									" — Enter Amount"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
								className: "text-xs text-[#7c533f]",
								children: "Touch the numbers below to enter the exact bill amount."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "my-3 rounded-2xl bg-[#fbf6ee] border-2 border-[#d8c5af] p-4 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold text-[#7c533f] uppercase tracking-wider block",
								children: "Total Amount"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-4xl md:text-5xl font-mono font-extrabold text-[#4a1c14] mt-1",
								children: ["₹ ", customAmountStr]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap items-center justify-center gap-1.5 py-1",
							children: [
								10,
								20,
								50,
								100,
								200,
								500
							].map((amt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => handleAddChipAmount(amt),
								className: "px-3 py-1 rounded-full text-xs font-bold bg-[#f2e5d5] hover:bg-[#8b2500] hover:text-white text-[#6b4a3a] border border-[#d8c5af] transition-all",
								children: ["+₹", amt]
							}, amt))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2.5 my-2",
							children: [
								[
									"1",
									"2",
									"3",
									"4",
									"5",
									"6",
									"7",
									"8",
									"9"
								].map((num) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => handleKeypadDigit(num),
									className: "h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center",
									children: num
								}, num)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleKeypadClear,
									className: "h-14 rounded-2xl text-lg font-bold bg-rose-50 hover:bg-rose-100 active:scale-95 border-2 border-rose-200 text-rose-700 transition-all flex items-center justify-center",
									children: "Clear"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => handleKeypadDigit("0"),
									className: "h-14 rounded-2xl text-2xl font-bold font-mono bg-white hover:bg-[#f7ece0] active:scale-95 border-2 border-[#e5d8c5] shadow-sm text-[#4a1c14] transition-all flex items-center justify-center",
									children: "0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleKeypadBackspace,
									className: "h-14 rounded-2xl text-lg font-bold bg-amber-50 hover:bg-amber-100 active:scale-95 border-2 border-amber-200 text-amber-800 transition-all flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delete, { className: "size-6" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
							className: "flex-col sm:flex-row gap-2 mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "outline",
								onClick: () => setCustomService(null),
								className: "w-full sm:w-auto rounded-xl border-[#d8c5af]",
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								disabled: busy || Number(customAmountStr) <= 0,
								onClick: () => customService && executePunch(customService.id, Number(customAmountStr)),
								className: "w-full sm:flex-1 h-12 text-base font-bold bg-[#4a1c14] hover:bg-[#8b2500] text-white rounded-xl shadow-lg",
								children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-5 animate-spin mr-2" }) : `Confirm & Pay ₹${customAmountStr}`
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "text-center text-xs font-medium text-[#8f6853] py-2",
				children: "Shree Swaminarayan Gurukul Kiosk Terminal • Powered by Mantra MFS110 Biometrics & NFC"
			})
		]
	});
}
//#endregion
export { Kiosk as component };
