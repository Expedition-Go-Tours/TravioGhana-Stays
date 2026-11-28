import { Suspense } from "react";
import { Outlet, useMatches } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";
import PageSkeleton from "./PageSkeleton";
import PageTransition from "./PageTransition";
import { NAV_WIDTH_CLASSES } from "./shell";

/**
 * The signed-in layout: sidebar (drawer on phones), fixed header, main area.
 * `--nav-w` (see shell.ts) is set here, so the sidebar, the header and the
 * main area all offset by the same width.
 */
export default function AppShell() {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const matches = useMatches();

  // Routes that own their full-viewport layout opt out of the shared container
  // with `handle.bleed` in router.tsx (they import SHELL_GUTTER themselves).
  const isBleed = matches.some((match) => (match.handle as { bleed?: boolean } | undefined)?.bleed);

  return (
    <div className={cn("min-h-dvh bg-bg", isCollapsed ? NAV_WIDTH_CLASSES.collapsed : NAV_WIDTH_CLASSES.expanded)}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-(--z-toast) focus:rounded-control focus:bg-brand focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-on-brand"
      >
        Skip to main content
      </a>
      <Sidebar />
      <Header />
      <main id="main" tabIndex={-1} className="pt-16 outline-none transition-[padding] duration-200 md:pl-[var(--nav-w)]">
        <PageContainer bleed={isBleed}>
          <PageTransition fadeOnly={isBleed}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </PageContainer>
      </main>
    </div>
  );
}
