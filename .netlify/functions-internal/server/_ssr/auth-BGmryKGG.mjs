import { i as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-Cy02cvZt.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as useNavigate, h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Mail, M as Lock, N as LoaderCircle, O as Monitor, _ as ShieldCheck, rt as ArrowRight } from "../_libs/lucide-react.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Card } from "./card-CzXpCsbD.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-BGmryKGG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuthPage() {
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({
				to: "/admin",
				replace: true
			});
		});
	}, [navigate]);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});
			if (error) throw error;
			toast.success("Welcome back to Gurukul Admin Portal!");
			navigate({
				to: "/admin",
				replace: true
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Invalid credentials. Please check your email/password.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-screen bg-gradient-to-br from-[#2c1810] via-[#4a1c14] to-[#1a0f0a] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-1/4 -left-32 size-96 rounded-full bg-[#8b2500]/30 blur-3xl pointer-events-none animate-pulse" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-1/4 -right-32 size-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "w-full max-w-md p-8 md:p-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl text-white space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-500",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mx-auto size-16 rounded-2xl bg-gradient-to-tr from-[#8b2500] to-amber-600 flex items-center justify-center shadow-lg border border-amber-400/30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-9 text-white" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300",
								children: "Shree Swaminarayan Gurukul"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-2xl md:text-3xl font-serif font-extrabold tracking-tight text-white",
								children: "Admin Portal"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-white/70",
								children: "Secure administrative access for kiosk & student accounts"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "space-y-4",
						onSubmit: submit,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "email",
									className: "text-xs font-semibold text-white/90",
									children: "Staff Email Address"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "size-4 absolute left-3.5 top-3.5 text-white/40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "email",
										type: "email",
										required: true,
										placeholder: "anshsangani2007@gmail.com",
										value: email,
										onChange: (e) => setEmail(e.target.value),
										className: "h-11 pl-10 bg-black/20 border-white/15 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500 focus-visible:border-amber-500"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "password",
									className: "text-xs font-semibold text-white/90",
									children: "Password"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4 absolute left-3.5 top-3.5 text-white/40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "password",
										type: "password",
										required: true,
										placeholder: "••••••••",
										value: password,
										onChange: (e) => setPassword(e.target.value),
										className: "h-11 pl-10 bg-black/20 border-white/15 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500 focus-visible:border-amber-500"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: busy,
								className: "w-full h-12 text-sm font-bold bg-gradient-to-r from-[#8b2500] to-amber-700 hover:from-[#a32c00] hover:to-amber-600 text-white rounded-xl shadow-xl transition-all active:scale-98 mt-2",
								children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin mr-2" }), " Authenticating..."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Sign In to Admin Portal ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4 ml-2" })] })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pt-4 border-t border-white/10 text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							className: "inline-flex items-center gap-2 text-xs font-semibold text-amber-300/80 hover:text-amber-300 transition-colors",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, { className: "size-3.5" }), " Return to Cashless Kiosk Screen"]
						})
					})
				]
			})
		]
	});
}
//#endregion
export { AuthPage as component };
