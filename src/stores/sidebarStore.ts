import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidebarState = {
  /** Desktop only: the sidebar is shrunk to the icon rail. Remembered per browser. */
  isCollapsed: boolean;
  /** Phones only: the navigation drawer is open. */
  isMobileOpen: boolean;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      openMobile: () => set({ isMobileOpen: true }),
      closeMobile: () => set({ isMobileOpen: false }),
      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
    }),
    {
      name: "stays-sidebar",
      // The drawer always starts closed; only the desktop preference persists.
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    },
  ),
);
