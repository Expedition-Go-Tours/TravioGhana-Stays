import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WORKSPACES, type Workspace } from "@/config/staysWorkspace";

type StaysWorkspaceState = {
  /** Which workspace the shell renders. Stays-only app: always STAYS. */
  workspace: Workspace;
  /** Retained so the persisted key from the supplier portal rehydrates cleanly. */
  userOverride: boolean;
  activePropertyId: string | null;

  switchWorkspace: (workspace: Workspace) => void;
  syncWorkspace: (workspace: Workspace) => void;
  setActivePropertyId: (activePropertyId: string | null) => void;
  resetWorkspacePreference: () => void;
};

/**
 * Which workspace the shell is currently rendering, and the property the
 * Stays pages are scoped to.
 *
 * This repo ships the Stays workspace only, so `workspace` is pinned to
 * `STAYS`; `activePropertyId` is still shared by the Stays pages so they agree
 * on which property a cross-page action refers to.
 */
export const useStaysWorkspaceStore = create<StaysWorkspaceState>()(
  persist(
    (set) => ({
      workspace: WORKSPACES.STAYS,
      userOverride: false,
      activePropertyId: null,

      /** Explicit switch — kept for parity with the portal's store shape. */
      switchWorkspace: (workspace) => set({ workspace, userOverride: true }),

      /** Route-driven sync — does not mark a user preference. */
      syncWorkspace: (workspace) =>
        set((state) => (state.workspace === workspace ? state : { workspace })),

      setActivePropertyId: (activePropertyId) => set({ activePropertyId }),

      /** Test/debug helper: forget the preference. */
      resetWorkspacePreference: () => set({ workspace: WORKSPACES.STAYS, userOverride: false }),
    }),
    {
      name: "stays-workspace",
      partialize: (state) => ({
        workspace: state.workspace,
        userOverride: state.userOverride,
        activePropertyId: state.activePropertyId,
      }),
    }
  )
);

/** Non-reactive read, for helpers that run outside React. */
export function getWorkspace(): Workspace {
  return useStaysWorkspaceStore.getState().workspace;
}

export function isStaysWorkspace() {
  return getWorkspace() === WORKSPACES.STAYS;
}
