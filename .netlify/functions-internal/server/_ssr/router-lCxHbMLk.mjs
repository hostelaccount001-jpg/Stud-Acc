import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useRouter, c as HeadContent, d as Outlet, f as lazyRouteComponent, h as Link, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-lCxHbMLk.js
var router_lCxHbMLk_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-BUYh5Q6p.css";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-[#faf6ef] px-4 font-sans text-[#2c1810]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-[#e5d8c5] shadow-2xl space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-serif font-black text-[#8b2500]",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl font-serif font-bold text-[#4a1c14]",
					children: "Page Not Found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-[#7c533f]",
					children: "The page or route you are looking for does not exist in the Gurukul Kiosk ERP."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95",
						children: "Return to Kiosk Terminal"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-[#faf6ef] px-4 font-sans text-[#2c1810]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-[#e5d8c5] shadow-2xl space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-serif font-bold text-[#8b2500]",
					children: "Application Encountered an Error"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-[#7c533f]",
					children: error.message || "An unexpected error occurred. Please try refreshing."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap justify-center gap-3 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95",
						children: "Try Again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-xl border border-[#d8c5af] bg-white px-5 py-2.5 text-sm font-semibold text-[#6b4a3a] hover:bg-[#f7ece0] transition-all",
						children: "Go to Kiosk"
					})]
				})
			]
		})
	});
}
var Route$11 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Gurukul Kiosk ERP — Cashless Smart Terminal" },
			{
				name: "description",
				content: "Comprehensive Cashless Biometric & NFC Smart Card Kiosk ERP for Shree Swaminarayan Gurukul."
			},
			{
				name: "author",
				content: "Shree Swaminarayan Gurukul"
			},
			{
				property: "og:title",
				content: "Gurukul Kiosk ERP"
			},
			{
				property: "og:description",
				content: "Cashless smart card and fingerprint biometric kiosk system."
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "scroll-smooth antialiased",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "min-h-screen bg-[#faf6ef] text-[#2c1810] selection:bg-[#8b2500]/20 selection:text-[#4a1c14]",
			children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
		})]
	});
}
function RootComponent() {
	const { queryClient } = Route$11.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			richColors: true,
			position: "top-right",
			closeButton: true
		})]
	});
}
var $$splitComponentImporter$10 = () => import("./routes-B_CGYVFu.mjs");
var Route$10 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Gurukul Kiosk — Tap & Print Terminal" }, {
		name: "description",
		content: "Self-service cashless payment terminal with Mantra fingerprint, NFC card and touch keypad amount entry."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("../_authenticated-08s1DCj9.mjs");
var Route$9 = createFileRoute("/_authenticated")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./auth-BGmryKGG.mjs");
var Route$8 = createFileRoute("/auth")({
	head: () => ({ meta: [{ title: "Admin Portal Sign In — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Secure staff and administrator sign in to Gurukul Kiosk ERP."
	}] }),
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("../_authenticated.admin-CbjU8wc8.mjs");
var Route$7 = createFileRoute("/_authenticated/admin")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("../_authenticated.admin.index-YT4HiFyy.mjs");
var Route$6 = createFileRoute("/_authenticated/admin/")({
	head: () => ({ meta: [{ title: "Dashboard & Analytics — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Real-time analytics, transactions, revenue and student metrics at a glance."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("../_authenticated.admin.maintenance-vqvz8E42.mjs");
var Route$5 = createFileRoute("/_authenticated/admin/maintenance")({
	head: () => ({ meta: [{ title: "Format ERP & Database — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Selectively format or reset specific ERP modules: Students, Services, Limits, Reports, or Users."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("../_authenticated.admin.reports-CdyaBVHG.mjs");
var Route$4 = createFileRoute("/_authenticated/admin/reports")({
	head: () => ({ meta: [{ title: "Reports & Transactions Ledger — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Filter kiosk transactions, print full reports, reprint thermal receipts, edit or delete entries, and export to Excel."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("../_authenticated.admin.services-CIaJoqH0.mjs");
var Route$3 = createFileRoute("/_authenticated/admin/services")({
	head: () => ({ meta: [{ title: "Services & Pricing — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Configure kiosk services with fixed prices, custom amount touchscreen keypads, receipt printing and daily caps."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("../_authenticated.admin.settings-BvNJk3-7.mjs");
var Route$2 = createFileRoute("/_authenticated/admin/settings")({
	head: () => ({ meta: [{ title: "Limits & Messages — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Set cumulative daily spend cap and customize kiosk messages, title and receipt footer."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("../_authenticated.admin.staff-BAdWtyFj.mjs");
var Route$1 = createFileRoute("/_authenticated/admin/staff")({
	head: () => ({ meta: [
		{ title: "Users & Roles — Gurukul Kiosk Admin" },
		{
			name: "description",
			content: "Super Admin portal to manage users, assign roles and module permissions."
		},
		{
			property: "og:title",
			content: "Users & Roles — Gurukul Kiosk Admin"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("../_authenticated.admin.students-f8s5rkL2.mjs");
var Route = createFileRoute("/_authenticated/admin/students")({
	head: () => ({ meta: [{ title: "Students & Biometrics — Gurukul Kiosk ERP" }, {
		name: "description",
		content: "Add, edit, or delete students, enrol up to 6 fingerprints on Mantra MFS110, and manage NFC cards."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$10.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$11
});
var AuthenticatedRoute = Route$9.update({
	id: "/_authenticated",
	getParentRoute: () => Route$11
});
var AuthRoute = Route$8.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$11
});
var AuthenticatedAdminRoute = Route$7.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => AuthenticatedRoute
});
var AuthenticatedAdminIndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminRouteChildren = {
	AuthenticatedAdminMaintenanceRoute: Route$5.update({
		id: "/maintenance",
		path: "/maintenance",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminReportsRoute: Route$4.update({
		id: "/reports",
		path: "/reports",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminServicesRoute: Route$3.update({
		id: "/services",
		path: "/services",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminSettingsRoute: Route$2.update({
		id: "/settings",
		path: "/settings",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminStaffRoute: Route$1.update({
		id: "/staff",
		path: "/staff",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminStudentsRoute: Route.update({
		id: "/students",
		path: "/students",
		getParentRoute: () => AuthenticatedAdminRoute
	}),
	AuthenticatedAdminIndexRoute
};
var AuthenticatedRouteChildren = { AuthenticatedAdminRoute: AuthenticatedAdminRoute._addFileChildren(AuthenticatedAdminRouteChildren) };
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRoute: AuthenticatedRoute._addFileChildren(AuthenticatedRouteChildren),
	AuthRoute
};
var routeTree = Route$11._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter, router_lCxHbMLk_exports as t };
