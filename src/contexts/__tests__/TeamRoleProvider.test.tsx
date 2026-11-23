import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { permissionMatches } from '../teamRoleContext';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  mockSession: { mockSessionEnabled: false },
}));

vi.mock('@/lib/axios', () => ({ default: { get: mocks.get } }));
vi.mock('@/lib/mockSession', () => mocks.mockSession);
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) => selector({ isAuthenticated: true }),
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

  it('falls back to no permissions when the role request fails', async () => {
    mocks.get.mockReset().mockRejectedValue(new Error('offline'));
    render(
      <TeamRoleProvider>
        <Probe />
      </TeamRoleProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('finance')).toHaveTextContent('false');
  });
});
