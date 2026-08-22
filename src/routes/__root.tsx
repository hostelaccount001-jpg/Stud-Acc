import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf6ef] px-4 font-sans text-[#2c1810]">
      <div className="max-w-md text-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-[#e5d8c5] shadow-2xl space-y-4">
        <h1 className="text-7xl font-serif font-black text-[#8b2500]">404</h1>
        <h2 className="text-2xl font-serif font-bold text-[#4a1c14]">Page Not Found</h2>
        <p className="text-sm text-[#7c533f]">
          The page or route you are looking for does not exist in the Gurukul Kiosk ERP.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
          >
            Return to Kiosk Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf6ef] px-4 font-sans text-[#2c1810]">
      <div className="max-w-md text-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-[#e5d8c5] shadow-2xl space-y-4">
        <h1 className="text-2xl font-serif font-bold text-[#8b2500]">
          Application Encountered an Error
        </h1>
        <p className="text-sm text-[#7c533f]">
          {error.message || "An unexpected error occurred. Please try refreshing."}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-[#4a1c14] hover:bg-[#6b2c1a] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#d8c5af] bg-white px-5 py-2.5 text-sm font-semibold text-[#6b4a3a] hover:bg-[#f7ece0] transition-all"
          >
            Go to Kiosk
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gurukul Kiosk ERP — Cashless Smart Terminal" },
      { name: "description", content: "Comprehensive Cashless Biometric & NFC Smart Card Kiosk ERP for Shree Swaminarayan Gurukul." },
      { name: "author", content: "Shree Swaminarayan Gurukul" },
      { property: "og:title", content: "Gurukul Kiosk ERP" },
      { property: "og:description", content: "Cashless smart card and fingerprint biometric kiosk system." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#faf6ef] text-[#2c1810] selection:bg-[#8b2500]/20 selection:text-[#4a1c14]">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
