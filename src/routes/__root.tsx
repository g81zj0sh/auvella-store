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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { QuickAddSheet } from "@/components/site/QuickAddSheet";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useCartSync } from "@/hooks/useCartSync";
import { useDomTranslation } from "@/lib/preferences";
import { useCartStore } from "@/stores/cartStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
    console.error("Auvella root route error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      route: window.location.pathname,
    });
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "Auvella" },
      { name: "description", content: "Elevated everyday shapewear and essentials designed to sculpt, smooth, and feel like a second skin." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Auvella" },
      { property: "og:description", content: "Elevated everyday shapewear and essentials designed to sculpt, smooth, and feel like a second skin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Auvella" },
      { name: "twitter:description", content: "Elevated everyday shapewear and essentials designed to sculpt, smooth, and feel like a second skin." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d27d5e59-cbdf-4cb6-83f6-b965863e1e61" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d27d5e59-cbdf-4cb6-83f6-b965863e1e61" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useCartSync();
  useDomTranslation();
  useEffect(() => {
    // Rehydrate persisted preferences after mount so SSR HTML matches the
    // initial client render (avoids hydration mismatches from currency/lang).
    void import("@/lib/preferences").then((m) => m.usePreferences.persist?.rehydrate());
    void useCartStore.persist?.rehydrate();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GlobalQuickAdd />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}


function GlobalQuickAdd() {
  const product = useQuickAdd((s) => s.product);
  const open = useQuickAdd((s) => s.open);
  const setOpen = useQuickAdd((s) => s.setOpen);
  return <QuickAddSheet product={product} open={open} onOpenChange={setOpen} />;
}
