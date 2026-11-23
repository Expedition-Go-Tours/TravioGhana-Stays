import { beforeEach, describe, expect, it, vi } from 'vitest';

// Fail loudly if the invite flow ever reaches the network in mock mode.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: http }));

import { acceptInvite, declineInvite, fetchInviteDetails } from '../api';
import { staysMock } from '@/features/stays/mock/store';

beforeEach(() => {
  staysMock.reset();
  http.get.mockReset();
  http.post.mockReset();
});

describe('team invite API in mock mode', () => {
  it('loads the pending invitation from the demo dataset', async () => {
    const invite = await fetchInviteDetails('tm-3');
    expect(invite).toMatchObject({
      supplierName: 'Akwaaba Coast Hotel',
      invitedEmail: 'finance@akwaabacoast.com',
      roles: ['finance'],
    });
    expect(http.get).not.toHaveBeenCalled();
  });

  it('resolves any unknown token to the first pending invitation', async () => {
    await expect(fetchInviteDetails('demo-token')).resolves.toMatchObject({
      invitedEmail: 'finance@akwaabacoast.com',
    });
  });

  it('accepts once, then reports the invitation as used (410)', async () => {
    const member = await acceptInvite('tm-3');
    expect(member).toMatchObject({ id: 'tm-3', status: 'ACTIVE' });
    await expect(fetchInviteDetails('tm-3')).rejects.toMatchObject({ response: { status: 410 } });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('declines without touching the network', async () => {
    await expect(declineInvite('tm-3')).resolves.toEqual({ ok: true });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('reports a revoked invitation the way the API does', async () => {
    await staysMock.revokeTeamInvite('tm-3');
    await expect(fetchInviteDetails('tm-3')).rejects.toMatchObject({
      response: { status: 410, data: { message: 'Invitation has been revoked' } },
    });
  });
});
