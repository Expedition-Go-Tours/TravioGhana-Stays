/**
 * The page-access map is the contract between the navigation and the API.
 *
 * Every test here exists because a rule got out of sync with the permission
 * model: a page gated behind a key no role grants vanishes for the people
 * allowed to use it, and a page with no rule at all loads for every role and
 * then 403s on every request. These tests fail loudly the next time a key is
 * invented or a role drifts.
 *
 * This repo ships the Stays workspace only, so the map is the `stays.*` set.
 */
import { describe, expect, it } from 'vitest';
import {
  PAGE_ACCESS,
  SETTINGS_TAB_ACCESS,
  canOpenPath,
  canOpenSettingsTab,
  pageAccessFor,
} from '../pageAccess';
import {
  ADMIN_ONLY_PERMISSIONS,
  TEAM_ROLE_PERMISSIONS,
  TEAM_ROLES,
  permissionsForRoles,
} from '../teamRoles';

/** The same check the API-side `hasPermission` performs. */
const has = (roles, permission) =>
  permissionsForRoles(roles).includes('*') ||
  permissionsForRoles(roles).includes(permission);

const allRoles = Object.values(TEAM_ROLES);
/**
 * Every key the dashboard may ask for: what some role grants, plus the keys
 * that are deliberately owner-only (reached through admin's `*`).
 */
const grantedKeys = new Set([
  ...allRoles.flatMap((role) => TEAM_ROLE_PERMISSIONS[role]).filter((key) => key !== '*'),
  ...ADMIN_ONLY_PERMISSIONS,
]);

const visiblePages = (roles) =>
  Object.keys(PAGE_ACCESS).filter((path) => canOpenPath((p) => has(roles, p), path));

describe('PAGE_ACCESS integrity', () => {
  it('never invents a permission no role grants', () => {
    for (const [path, permission] of Object.entries(PAGE_ACCESS)) {
      if (!permission) continue;
      expect(grantedKeys, `${path} requires "${permission}"`).toContain(permission);
    }
  });

  it('never invents a permission for a settings tab either', () => {
    for (const [tab, permission] of Object.entries(SETTINGS_TAB_ACCESS)) {
      if (!permission) continue;
      expect(grantedKeys, `tab "${tab}" requires "${permission}"`).toContain(permission);
    }
  });

  it('keeps every settings tab that the page renders addressable', () => {
    for (const tab of ['profile', 'notifications', 'payouts', 'security', 'tax', 'team']) {
      expect(SETTINGS_TAB_ACCESS).toHaveProperty(tab);
    }
  });

  it('only declares paths inside the Stays workspace', () => {
    for (const path of Object.keys(PAGE_ACCESS)) {
      expect(path.startsWith('/stays'), `${path} is outside /stays`).toBe(true);
    }
  });
});

describe('role → page matrix', () => {
  it('lets the owner and an admin member reach every page', () => {
    expect(visiblePages(['admin'])).toEqual(Object.keys(PAGE_ACCESS));
  });

  it('gives an editor the catalogue and operations — but no money, chat or KYC', () => {
    const pages = visiblePages([TEAM_ROLES.EDITOR]);
    expect(pages).toEqual(
      expect.arrayContaining([
        '/stays',
        '/stays/properties',
        '/stays/bookings',
        '/stays/availability',
        '/stays/rates',
        '/stays/special-offers',
        '/stays/analytics',
        '/stays/notifications',
        '/stays/cancellation',
      ]),
    );
    expect(pages).not.toContain('/stays/finance');
    expect(pages).not.toContain('/stays/customers');
    expect(pages).not.toContain('/stays/verification');
  });

  it('gives finance the money pages and the reports — but no catalogue', () => {
    const pages = visiblePages([TEAM_ROLES.FINANCE]);
    expect(pages).toEqual(
      expect.arrayContaining(['/stays', '/stays/finance', '/stays/analytics']),
    );
    expect(pages).not.toContain('/stays/properties');
    expect(pages).not.toContain('/stays/bookings');
    expect(pages).not.toContain('/stays/customers');
  });

  it('gives support the conversations — and nothing they would 403 on', () => {
    const pages = visiblePages([TEAM_ROLES.SUPPORT]);
    expect(pages).toEqual(expect.arrayContaining(['/stays', '/stays/customers']));
    expect(pages).not.toContain('/stays/properties');
    expect(pages).not.toContain('/stays/finance');
    expect(pages).not.toContain('/stays/verification');
  });

  it('unions the pages of a two-role member (Editor + Finance)', () => {
    const pages = visiblePages([TEAM_ROLES.EDITOR, TEAM_ROLES.FINANCE]);
    expect(pages).toEqual(
      expect.arrayContaining([
        '/stays/properties',
        '/stays/bookings',
        '/stays/finance',
        '/stays/analytics',
      ]),
    );
    expect(pages).not.toContain('/stays/customers');
    expect(pages).not.toContain('/stays/verification');
  });

  it('keeps the customers page reachable by the role that answers customers', () => {
    expect(grantedKeys.has(PAGE_ACCESS['/stays/customers'])).toBe(true);
    expect(has([TEAM_ROLES.SUPPORT], PAGE_ACCESS['/stays/customers'])).toBe(true);
  });
});

describe('pageAccessFor', () => {
  it('matches nested routes to the longest declared prefix', () => {
    expect(pageAccessFor('/stays/properties/p-123').permission).toBe(PAGE_ACCESS['/stays/properties']);
    expect(pageAccessFor('/stays/special-offers/build/new').permission).toBe(
      PAGE_ACCESS['/stays/special-offers'],
    );
  });

  it('ignores a trailing slash, a query string and a hash', () => {
    expect(pageAccessFor('/stays/finance/').permission).toBe(PAGE_ACCESS['/stays/finance']);
    expect(pageAccessFor('/stays/finance?tab=payouts').permission).toBe(PAGE_ACCESS['/stays/finance']);
    expect(pageAccessFor('/stays/bookings#today').permission).toBe(PAGE_ACCESS['/stays/bookings']);
  });

  it('does not confuse a page with another page that prefixes its name', () => {
    expect(pageAccessFor('/staysx-archive').permission).toBeUndefined();
  });

  it('reports an unknown path as undefined so the 404 owns it', () => {
    expect(pageAccessFor('/definitely-not-a-page').permission).toBeUndefined();
    expect(canOpenPath(() => false, '/definitely-not-a-page')).toBe(true);
  });

  it('treats the workspace dashboard as open to every role', () => {
    expect(pageAccessFor('/stays').permission).toBeNull();
    expect(canOpenPath(() => false, '/stays')).toBe(true);
  });
});

describe('canOpenSettingsTab', () => {
  it('shows Security to everyone — it is their own password', () => {
    for (const role of allRoles) {
      expect(canOpenSettingsTab((p) => has([role], p), 'security')).toBe(true);
    }
  });

  it('hides the team tab from anyone but an admin member', () => {
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.SUPPORT], p), 'team')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.ADMIN], p), 'team')).toBe(true);
  });

  it('splits the business profile (admin+editor) from tax info (admin+finance)', () => {
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'profile')).toBe(true);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.EDITOR], p), 'tax')).toBe(false);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'tax')).toBe(true);
    expect(canOpenSettingsTab((p) => has([TEAM_ROLES.FINANCE], p), 'profile')).toBe(false);
  });

  it('gives a support member a settings page with at least one tab', () => {
    const tabs = Object.keys(SETTINGS_TAB_ACCESS).filter((tab) =>
      canOpenSettingsTab((p) => has([TEAM_ROLES.SUPPORT], p), tab),
    );
    expect(tabs).toEqual(['security']);
  });
});
