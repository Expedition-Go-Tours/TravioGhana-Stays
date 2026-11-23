import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { mockSessionEnabled } from "@/lib/mockSession";
import { permissionMatches, TeamRoleContext, type TeamRoleContextValue } from "./teamRoleContext";

type RoleState = {
  teamRole: string | null;
  teamRoles: string[];
  permissions: string[];
  isOwner: boolean;
  storefronts: string[];
};

const EMPTY_ROLE: RoleState = {
  teamRole: null,
  teamRoles: [],
  permissions: [],
  isOwner: false,
  storefronts: [],
};

/** Mock mode has no backend to ask: the seeded session is the business owner. */
const MOCK_OWNER_ROLE: RoleState = {
  teamRole: "admin",
  teamRoles: ["admin"],
  permissions: ["*"],
  isOwner: true,
  storefronts: ["GHANA"],
};

type MyRoleResponse = {
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  isOwner?: boolean;
  storefronts?: string[];
};

async function fetchMyRole(): Promise<RoleState> {
  try {
    const response = await api.get("/suppliers/settings/team/my-role", { skipGlobalErrorHandler: true });
    const data: MyRoleResponse = response.data?.data || {};
    return {
      teamRole: data.role || null,
      teamRoles: data.roles || (data.role ? [data.role] : []),
      permissions: data.permissions || [],
      isOwner: Boolean(data.isOwner),
      storefronts: data.storefronts || [],
    };
  } catch {
    return EMPTY_ROLE;
  }
}

export function TeamRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleState>(EMPTY_ROLE);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const refetch = useCallback(async () => {
    setLoading(true);
    setRole(mockSessionEnabled ? MOCK_OWNER_ROLE : await fetchMyRole());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred so the synchronous effect body stays free of state updates.
    Promise.resolve().then(async () => {
      if (cancelled) return;
      if (mockSessionEnabled) {
        setRole(MOCK_OWNER_ROLE);
        setLoading(false);
        return;
      }
      if (!isAuthenticated) {
        setRole(EMPTY_ROLE);
        setLoading(false);
        return;
      }
      setLoading(true);
      const next = await fetchMyRole();
      if (cancelled) return;
      setRole(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const value = useMemo<TeamRoleContextValue>(() => {
    // Permission-based, never role-name based: an ADMIN-role member who is not
    // the owner is treated exactly like the owner, and each key is the one the
    // API enforces on the matching route.
    const hasPermission = (permission: string) =>
      role.isOwner || permissionMatches(role.permissions, permission);
    return {
      ...role,
      loading,
      refetch,
      hasPermission,
      canManageTeam: () => hasPermission("settings.manage"),
      canManageTours: () => hasPermission("tours.view"),
      canManageFinance: () => hasPermission("payouts.view"),
      canManageChat: () => hasPermission("chat.view"),
      canManageAnalytics: () => hasPermission("analytics.view"),
      canManageBusinessProfile: () => hasPermission("settings.business"),
    };
  }, [role, loading, refetch]);

  return <TeamRoleContext.Provider value={value}>{children}</TeamRoleContext.Provider>;
}
