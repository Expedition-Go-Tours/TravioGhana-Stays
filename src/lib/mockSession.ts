/**
 * Development session for mock mode.
 *
 * `VITE_STAYS_DATA_SOURCE=mock` swaps the Stays API layer for the in-feature
 * dataset, but that alone is not enough to boot: `ProtectedRoute` still wants a
 * token, and `TeamRoleProvider` still asks the backend for the member's role.
 * With no backend and no Firebase project, the app would sit on `/login`
 * forever.
 *
 * This module is the missing half of the switch. When the Stays data source is
 * `mock` it seeds a supplier session, marks the user as the owner (`*`
 * permissions) and stops `TeamRoleProvider` from calling `/my-role`.
 *
 * It is inert in production: `config.stays.dataSource` defaults to `api`
 * outside development, so no fake session can leak into a real build.
 */
import { config } from "@/config";
import { useAuthStore } from "@/stores/authStore";

/** True when the app is running against the in-feature dataset. */
export const mockSessionEnabled = config.stays.dataSource !== "api";

const MOCK_TOKEN = "mock-session-token";

const MOCK_USER = {
  id: "mock-supplier-owner",
  name: "Ama Boateng",
  email: "owner@travioghana.test",
  roles: ["supplier"],
  avatar: "",
  createdAt: "2021-03-04T00:00:00.000Z",
};

const MOCK_SUPPLIER_PROFILE = {
  status: "ACTIVE",
  businessName: "Travio Ghana Stays (demo)",
  supplierSince: "2021-03-04T00:00:00.000Z",
  businessInfo: { legalBusinessName: "Travio Ghana Stays (demo)" },
};

/**
 * Seed the session before React mounts. Call once, from `main.tsx`.
 */
export function installMockSession() {
  if (!mockSessionEnabled) return;

  localStorage.setItem("auth_token", MOCK_TOKEN);
  localStorage.setItem("auth_user", JSON.stringify(MOCK_USER));

  useAuthStore.setState({
    user: MOCK_USER,
    token: MOCK_TOKEN,
    isAuthenticated: true,
    isLoading: false,
    hasHydrated: true,
    supplierProfile: MOCK_SUPPLIER_PROFILE,
  });
}
