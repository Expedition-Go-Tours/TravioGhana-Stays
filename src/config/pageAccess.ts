/**
 * Who can open which page — one source of truth for the whole shell.
 *
 * The sidebar, the search palette and the route guards all read this map, so a
 * page can never end up in one place and not the other.
 *
 * A `null` permission means "every signed-in supplier can open this" — use it
 * only for pages that genuinely work for every role (the dashboard overview,
 * the cancellation rollup, the per-account notifications page and settings,
 * whose tabs are gated individually). Everything else must name the permission
 * the API enforces, using the keys from the API's permission model.
 *
 * The `stays.*` keys must exist in the API's permission model — see the mirror
 * in config/teamRoles.js (and the drift test in
 * config/__tests__/pageAccess.test.js).
 */
export const PAGE_ACCESS = {
  // Dashboard is open to every role: it only reads supplier-scoped numbers.
  "/stays": null,
  "/stays/properties": "stays.view",
  "/stays/properties/build": "stays.manage",
  "/stays/bookings": "stays.bookings",
  "/stays/customers": "chat.view",
  "/stays/reviews": "stays.reviews",
  "/stays/availability": "stays.availability",
  "/stays/rates": "stays.rates",
  "/stays/special-offers": "stays.offers",
  // Cancellation gauge is a read-only rollup of the supplier's own rate.
  "/stays/cancellation": null,
  "/stays/finance": "payouts.view",
  // Reports are shared with finance (`analytics.view`), the same key the
  // Experiences analytics page used — `stays.analytics` would hide them from
  // the role whose job is the numbers.
  "/stays/analytics": "analytics.view",
  // Notifications are per-account alerts (every member has their own inbox);
  // verification is owner territory; the settings tabs are gated per-tab.
  "/stays/notifications": null,
  "/stays/verification": "settings.manage",
  "/stays/settings": null,
};

/**
 * The permission a path needs, honouring nested routes (`/stays/properties/:id`,
 * `/stays/special-offers/build/:id`) by matching the longest declared prefix.
 * Returns undefined for paths the map says nothing about (unknown routes).
 */
export function pageAccessFor(pathname) {
  const path = (pathname || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return { permission: undefined };

  const match = Object.keys(PAGE_ACCESS)
    .filter((key) => path === key || path.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (!match) return { permission: undefined };
  return { permission: PAGE_ACCESS[match] };
}

/** `canOpenPath(hasPermission, "/stays/finance")` — true when no rule blocks it. */
export function canOpenPath(hasPermission, pathname) {
  const { permission } = pageAccessFor(pathname);
  if (permission === undefined) return true; // unknown route: let the 404 handle it
  if (!permission) return true;
  return hasPermission(permission);
}

/**
 * Settings tabs follow the same idea, one rule per tab: the key is what the
 * tab's WRITES require in the API, so nobody opens a form whose Save button is
 * guaranteed to 403. `security` carries no rule — every member may change
 * their own password and manage their own session.
 */
export const SETTINGS_TAB_ACCESS = {
  profile: "settings.business",
  notifications: "settings.manage",
  payouts: "payouts.view",
  security: null,
  tax: "settings.tax",
  team: "settings.manage",
};

/** `canOpenSettingsTab(hasPermission, "team")` */
export function canOpenSettingsTab(hasPermission, tab) {
  const permission = SETTINGS_TAB_ACCESS[tab];
  if (permission === undefined) return true; // unknown tab: not our call to hide
  if (!permission) return true;
  return hasPermission(permission);
}
