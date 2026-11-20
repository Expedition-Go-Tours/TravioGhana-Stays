import { Outlet, useLocation, useMatches } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";
import { useSidebarStore } from "@/stores/sidebarStore";

export default function AppShell() {
  const { isCollapsed, isMobileOpen } = useSidebarStore();
  const location = useLocation();
  const matches = useMatches();

  // Only the property builder with a draft id owns the viewport;
  // `/stays/properties/build` is the category chooser and keeps the normal shell.
  const isStaysBuilder = /^\/stays\/properties\/build\/.+/.test(location.pathname);
  const isChatPage = location.pathname.startsWith("/stays/customers");

  // Routes that own their full-viewport layout opt out of the shared container
  // with `handle.bleed` in router.tsx (they import SHELL_GUTTER themselves).
  const isBleed = matches.some(
    (match) => (match.handle as { bleed?: boolean } | undefined)?.bleed
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => useSidebarStore.getState().closeMobile()}
        />
      )}
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-[64px]" : "lg:ml-[270px]"
        }`}
      >
        <PageContainer bleed={isBleed}>
          <Outlet />
        </PageContainer>
      </main>
      {!isStaysBuilder && !isChatPage && null}
    </div>
  );
}
