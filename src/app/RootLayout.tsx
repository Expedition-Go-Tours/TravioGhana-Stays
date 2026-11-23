import { Outlet } from "react-router-dom";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { TeamRoleProvider } from "@/contexts/TeamRoleProvider";
import { Toaster } from "sonner";
import { useThemeStore } from "@/stores/themeStore";

export default function RootLayout() {
  // Toasts follow the resolved theme; the font is inherited from <body>.
  const theme = useThemeStore((state) => state.resolved);

  return (
    <>
      <ScrollToTop />
      <TeamRoleProvider>
        <Outlet />
      </TeamRoleProvider>
      <Toaster position="top-right" richColors closeButton theme={theme} />
    </>
  );
}
