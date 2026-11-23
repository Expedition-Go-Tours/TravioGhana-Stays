import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { permissionMatches } from '../teamRoleContext';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  mockSession: { mockSessionEnabled: false },
  auth: { isAuthenticated: true, user: { roles: ['customer'] } },
}));

vi.mock('@/lib/axios', () => ({ default: { get: mocks.get } }));
vi.mock('@/lib/mockSession', () => mocks.mockSession);
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: typeof mocks.auth) => unknown) => selector(mocks.auth),
}));

import { TeamRoleProvider } from '../TeamRoleProvider';
import { useTeamRole } from '@/hooks/useTeamRole';

describe('permissionMatches', () => {
  it('matches exact permissions and the global wildcard', () => {
    expect(permissionMatches(['bookings.view'], 'bookings.view')).toBe(true);
    expect(permissionMatches(['*'], 'anything.at.all')).toBe(true);
    expect(permissionMatches(['bookings.view'], 'bookings.manage')).toBe(false);
  });

  it('matches a scoped wildcard on the whole segment only', () => {
    expect(permissionMatches(['tours.*'], 'tours.view')).toBe(true);
    expect(permissionMatches(['tours.*'], 'tours.manage.photos')).toBe(true);
    // The old check granted these.
    expect(permissionMatches(['tours.*'], 'tour.view')).toBe(false);
    expect(permissionMatches(['settings*'], 'settingsX.y')).toBe(false);
    expect(permissionMatches(['tours.*'], 'toursX.view')).toBe(false);
  });

  it('accepts the legacy dotless wildcard as the same scope', () => {
    expect(permissionMatches(['settings*'], 'settings.business')).toBe(true);
  });

  it('grants nothing from an empty list', () => {
    expect(permissionMatches([], 'bookings.view')).toBe(false);
  });
});

function Probe() {
  const role = useTeamRole();
  return (
    <div>
      <span data-testid="loading">{String(role.loading)}</span>
      <span data-testid="roles">{role.teamRoles.join(',')}</span>
      <span data-testid="finance">{String(role.canManageFinance())}</span>
      <span data-testid="team">{String(role.canManageTeam())}</span>
    </div>
  );
}

describe('TeamRoleProvider', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.auth.isAuthenticated = true;
    mocks.auth.user = { roles: ['customer'] };
  });

  it('loads the member role once and answers permission checks from it', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { role: 'finance', roles: ['finance'], permissions: ['payouts.*'], isOwner: false } },
    });
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('roles')).toHaveTextContent('finance');
    expect(screen.getByTestId('finance')).toHaveTextContent('true');
    expect(screen.getByTestId('team')).toHaveTextContent('false');
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });

  it('grants an ADMIN role every privilege regardless of casing or empty permissions', async () => {
    mocks.get.mockResolvedValue({
      data: { data: { role: 'ADMIN', roles: [{ name: 'ADMIN' }], permissions: [], isOwner: false } },
    });
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('roles')).toHaveTextContent('admin');
    expect(screen.getByTestId('finance')).toHaveTextContent('true');
    expect(screen.getByTestId('team')).toHaveTextContent('true');
  });

  it('keeps a supplier account on full access when /my-role is unavailable', async () => {
    mocks.auth.user = { roles: ['supplier'] };
    mocks.get.mockRejectedValue(new Error('offline'));
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('finance')).toHaveTextContent('true');
    expect(screen.getByTestId('team')).toHaveTextContent('true');
  });

  it('treats an admin user account as full access even when the role payload is narrower', async () => {
    mocks.auth.user = { roles: ['admin'] };
    mocks.get.mockResolvedValue({
      data: { data: { role: 'finance', roles: ['finance'], permissions: ['payouts.view'], isOwner: false } },
    });
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('finance')).toHaveTextContent('true');
    expect(screen.getByTestId('team')).toHaveTextContent('true');
  });

  it('falls back to no permissions when the role request fails for a customer account', async () => {
    mocks.auth.user = { roles: ['customer'] };
    mocks.get.mockRejectedValue(new Error('offline'));
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('finance')).toHaveTextContent('false');
  });
});
