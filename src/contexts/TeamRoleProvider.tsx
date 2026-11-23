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

/** Role names the API may use for a full-access account. */
const ADMIN_ROLE_NAMES = new Set(["admin", "administrator", "owner", "super_admin", "super-admin", "superadmin"]);

type RoleLike =
  | string
  | { name?: string; slug?: string; key?: string; role?: string }
  | null
  | undefined;

type MyRoleResponse = {
  role?: RoleLike;
  roles?: RoleLike[];
  permissions?: string[];
  isOwner?: boolean | string;
  storefronts?: string[];
};

function roleName(value: RoleLike): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  return String(value.name ?? value.slug ?? value.key ?? value.role ?? "").trim().toLowerCase();
}

function normalizeRoles(role: RoleLike, roles: RoleLike[] | undefined): string[] {
  const list = [...(Array.isArray(roles) ? roles : []), role].map(roleName).filter(Boolean);
  return [...new Set(list)];
}

function isAdminRole(role: RoleState): boolean {
  if (role.isOwner) return true;
  if (role.permissions.includes("*")) return true;
  return [role.teamRole, ...role.teamRoles].some((name) =>
    ADMIN_ROLE_NAMES.has(String(name ?? "").trim().toLowerCase()),
  );
}

async function fetchMyRole(): Promise<RoleState> {
  try {
    const response = await api.get("/suppliers/settings/team/my-role", { skipGlobalErrorHandler: true });
    const data: MyRoleResponse = response.data?.data || {};
    const teamRole = roleName(data.role) || null;
    const teamRoles = normalizeRoles(data.role, data.roles);
    return {
      teamRole: teamRole || teamRoles[0] || null,
      teamRoles: teamRoles.length ? teamRoles : teamRole ? [teamRole] : [],
      permissions: Array.isArray(data.permissions)
        ? data.permissions.filter((permission): permission is string => typeof permission === "string")
        : [],
      isOwner: data.isOwner === true || data.isOwner === "true",
      storefronts: Array.isArray(data.storefronts)
        ? data.storefronts.filter((storefront): storefront is string => typeof storefront === "string")
        : [],
    };
  } catch {
    return EMPTY_ROLE;
  }
}

export function TeamRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleState>(EMPTY_ROLE);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

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

  // A supplier account is the business owner, and an admin user role is the
  // same authority. Treat either as full access even if `/my-role` is
  // unavailable or disagrees. Team members use plain customer accounts.
  const userRoles = (user?.roles ?? []).map((name) => String(name).trim().toLowerCase());
  const isAdminUserAccount = userRoles.some(
    (name) => name === "supplier" || ADMIN_ROLE_NAMES.has(name),
  );

  const value = useMemo<TeamRoleContextValue>(() => {
    const effectiveRole = isAdminUserAccount
      ? { ...MOCK_OWNER_ROLE, storefronts: role.storefronts.length ? role.storefronts : MOCK_OWNER_ROLE.storefronts }
      : role;
    const hasAdminAccess = isAdminRole(effectiveRole);
    const hasPermission = (permission: string) =>
      hasAdminAccess || permissionMatches(effectiveRole.permissions, permission);
    return {
      ...effectiveRole,
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
  }, [role, loading, refetch, isAdminUserAccount]);

  return <TeamRoleContext.Provider value={value}>{children}</TeamRoleContext.Provider>;
}
