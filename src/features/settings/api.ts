/**
 * Team invitations — the accept / decline flow behind `/team/invite`.
 *
 * Every other settings call lives in `features/stays/settingsApi.ts`; the
 * copies that used to sit here had no mock branch and no callers.
 *
 * In mock mode these resolve against the demo dataset, so the invite page
 * never reaches the live API from a demo session.
 */
import api from "@/lib/axios";
import { staysUsesMockData } from "@/features/stays/api";
import { staysMock } from "@/features/stays/mock/store";

export type InviteDetails = {
  supplierName: string;
  invitedEmail: string;
  roles?: string[];
  /** Legacy single-role field older invitations still carry. */
  role?: string;
  invitedBy?: string;
  expiresAt?: string;
};

const requestConfig = { skipGlobalErrorHandler: true };

export async function fetchInviteDetails(token: string): Promise<InviteDetails | null> {
  if (staysUsesMockData) return staysMock.getInviteDetails(token);
  const response = await api.get(`/suppliers/settings/team/invite/${token}`, requestConfig);
  return response.data?.data || null;
}

export async function acceptInvite(token: string): Promise<unknown> {
  if (staysUsesMockData) return staysMock.acceptInvite(token);
  const response = await api.post(`/suppliers/settings/team/invite/${token}/accept`, {}, requestConfig);
  return response.data?.data?.member || null;
}

export async function declineInvite(token: string): Promise<unknown> {
  if (staysUsesMockData) return staysMock.declineInvite(token);
  return api.post(`/suppliers/settings/team/invite/${token}/decline`, {}, requestConfig);
}
