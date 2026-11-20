import { Outlet } from "react-router-dom";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { TeamRoleProvider } from "@/contexts/TeamRoleProvider";
import { Toaster } from "sonner";

export default function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <TeamRoleProvider>
        <Outlet />
      </TeamRoleProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
          },
        }}
      />
    </>
  );
}
