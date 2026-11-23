import { createContext } from "react";

/**
 * Team-role context, split into its own module so the provider file only
 * exports React components (react-refresh/only-export-components).
 * Read it with `useTeamRole()` from `@/hooks/useTeamRole`.
 */
export type TeamRoleContextValue = {
  teamRole: string | null;
  teamRoles: string[];
  permissions: string[];
  isOwner: boolean;
  /** Storefronts the business is on (e.g. ["GHANA", "EXPEDITION"]), from /my-role. */
  storefronts: string[];
  loading: boolean;
  refetch: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canManageTeam: () => boolean;
  canManageTours: () => boolean;
  canManageFinance: () => boolean;
  canManageChat: () => boolean;
  canManageAnalytics: () => boolean;
  canManageBusinessProfile: () => boolean;
};

export const TeamRoleContext = createContext<TeamRoleContextValue | null>(null);

/**
 * Permission check shared by the provider and its tests.
 *
 * Wildcards match on a whole dotted prefix: `tours.*` grants `tours.view` and
 * `tours.manage.x`, but not `tour.view` or `toursX.view`. `*` grants
 * everything. (The old check compared only the first segment against the raw
 * pattern, so `tours.*` also granted `tour.view`.)
 */
export function permissionMatches(granted: string[], permission: string): boolean {
  for (const pattern of granted) {
    if (pattern === "*" || pattern === permission) return true;
    if (!pattern.endsWith("*")) continue;
    // "tours.*" and the legacy dotless "tours*" both mean the `tours` segment.
    const scope = pattern.slice(0, -1).replace(/\.$/, "");
    if (scope && permission.startsWith(`${scope}.`)) return true;
  }
  return false;
}
