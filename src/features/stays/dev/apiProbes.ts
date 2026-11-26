/**
 * Read-only probes for the dev API status page (`/stays/dev/api-status`).
 *
 * One probe per GET-style function in the Stays API modules. Each probe sends
 * the same path and params as the module's live branch, through the same
 * axios client (so the Ghana path rewrite, auth header and auth guard all
 * apply), and checks the raw fields that module's mapping code reads.
 *
 * SAFETY: probes can only issue GET requests — `runProbes` calls `api.get`
 * and nothing else, and the unit test spies on every other method. Never add
 * a mutation here.
 *
 * Keep paths in sync with the modules when an endpoint moves; the module
 * reference on each probe says where to look.
 */
import type { AxiosResponse } from "axios";
import api, { rewriteSupplierPath } from "@/lib/axios";
import { isNotAvailable } from "@/lib/errorHandler";
import { checkList, checkShape, collectCurrencies, RAW, type ShapeIssue } from "@/types/guards";
const S = "/stays/supplier";

/** The workspace default; any other currency is reported as a note, not an error. */
const DEFAULT_REPORT_CURRENCY = "USD";

/** Ids discovered by earlier probes, used by later ones (property → availability, …). */
export type ProbeContext = { propertyId?: string; offerId?: string; conversationId?: string };

type Body = { data?: Record<string, unknown> } & Record<string, unknown>;

export type Probe = {
  id: string;
  module: string;
  fn: string;
  /** Path as the module writes it (before the Ghana rewrite). `null` = skip (missing id). */
  path: (ctx: ProbeContext) => string | null;
  params?: Record<string, unknown>;
  /** Shape issues for the raw response body; may record ids for later probes. */
  check: (body: Body, ctx: ProbeContext) => { issues: ShapeIssue[]; rows?: number };
};

const data = (body: Body) => (body?.data ?? {}) as Record<string, unknown>;
const list = (body: Body, key: string) => data(body)[key];
const firstId = (rows: unknown) =>
  Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? String((rows[0] as { id?: unknown }).id ?? "") || undefined : undefined;
const count = (rows: unknown) => (Array.isArray(rows) ? rows.length : undefined);

function listProbe(spec: Parameters<typeof checkList>[1], key: string, remember?: keyof ProbeContext) {
  return (body: Body, ctx: ProbeContext) => {
    const rows = list(body, key);
    if (remember && !ctx[remember]) ctx[remember] = firstId(rows);
    return { issues: checkList(rows, spec, `data.${key}[]`), rows: count(rows) };
  };
}

export const PROBES: Probe[] = [
  // ── features/stays/api.ts ─────────────────────────────────────────────────
  {
    id: "dashboard", module: "stays/api.ts", fn: "fetchStaysDashboard",
    path: () => `${S}/dashboard`,
    check: (body) => ({ issues: checkShape(data(body), RAW.dashboard, "data") }),
  },
  {
    id: "properties", module: "stays/api.ts", fn: "listProperties",
    path: () => `${S}/properties`,
    check: listProbe(RAW.property, "properties", "propertyId"),
  },
  {
    id: "property", module: "stays/api.ts", fn: "getProperty",
    path: (ctx) => (ctx.propertyId ? `${S}/properties/${ctx.propertyId}` : null),
    check: (body) => ({ issues: checkShape(data(body).property, RAW.property, "data.property") }),
  },
  {
    id: "availability", module: "stays/api.ts", fn: "getAvailability",
    path: (ctx) => (ctx.propertyId ? `${S}/properties/${ctx.propertyId}/availability` : null),
    params: (() => {
      const from = new Date();
      const to = new Date(from.getTime() + 30 * 86400000);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    })(),
    check: (body) => ({ issues: checkShape(data(body), RAW.availability, "data") }),
  },
  {
    id: "bookings", module: "stays/api.ts", fn: "listStaysBookings",
    path: () => `${S}/bookings`,
    check: listProbe(RAW.booking, "bookings"),
  },
  {
    id: "offers", module: "stays/api.ts", fn: "listOffers",
    path: () => `${S}/offers`,
    check: listProbe(RAW.offer, "offers", "offerId"),
  },
  {
    id: "offer", module: "stays/api.ts", fn: "getOffer",
    path: (ctx) => (ctx.offerId ? `${S}/offers/${ctx.offerId}` : null),
    check: (body) => ({ issues: checkShape(data(body).offer, RAW.offer, "data.offer") }),
  },
  {
    id: "reviews", module: "stays/api.ts", fn: "listStaysReviews",
    path: () => `${S}/reviews`,
    check: listProbe(RAW.review, "reviews"),
  },
  {
    id: "cancellation", module: "stays/api.ts", fn: "fetchCancellationSummary",
    path: () => `${S}/cancellation`,
    check: (body) => ({ issues: checkShape(data(body), RAW.cancellationSummary, "data") }),
  },
  {
    id: "cancellation-records", module: "stays/api.ts", fn: "fetchCancellationRecords",
    path: () => `${S}/cancellation/records`,
    check: listProbe(RAW.cancellationRecord, "records"),
  },
  {
    id: "analytics-summary", module: "stays/api.ts", fn: "fetchStaysAnalyticsSummary",
    path: () => `${S}/analytics/summary`,
    check: (body) => ({ issues: checkShape(data(body), RAW.analyticsSummary, "data") }),
  },
  {
    id: "analytics-properties", module: "stays/api.ts", fn: "fetchStaysPropertyAnalytics",
    path: () => `${S}/analytics/properties`,
    check: listProbe(RAW.propertyAnalytics, "properties"),
  },
  {
    id: "analytics-monthly", module: "stays/api.ts", fn: "fetchStaysMonthlyRevenue",
    path: () => `${S}/analytics/monthly-revenue`,
    params: { months: 12 },
    check: listProbe(RAW.monthlyRevenue, "months"),
  },

  // ── features/stays/financeApi.ts ──────────────────────────────────────────
  {
    id: "finance-summary", module: "stays/financeApi.ts", fn: "fetchFinanceSummary",
    path: () => `${S}/finance/summary`,
    check: (body) => ({ issues: checkShape(data(body), RAW.financeSummary, "data") }),
  },
  {
    id: "finance-earnings", module: "stays/financeApi.ts", fn: "fetchFinanceEarnings",
    path: () => `${S}/finance/earnings`,
    params: { page: 1, limit: 20 },
    check: listProbe(RAW.earningRaw, "earnings"),
  },
  {
    id: "finance-payout-requests", module: "stays/financeApi.ts", fn: "fetchPayoutRequests",
    path: () => `${S}/finance/payouts/requests`,
    params: { page: 1, limit: 20 },
    check: listProbe(RAW.payoutRequestRaw, "requests"),
  },
  {
    id: "finance-payout-settings", module: "stays/financeApi.ts", fn: "fetchPayoutSettings",
    path: () => `${S}/finance/payout-settings`,
    check: (body) => ({ issues: checkShape(data(body), RAW.payoutSettings, "data") }),
  },
  {
    id: "finance-charges", module: "stays/financeApi.ts", fn: "getFinanceCharges",
    path: () => `${S}/finance/charges`,
    check: listProbe(RAW.chargeRaw, "charges"),
  },
  {
    id: "finance-disputes", module: "stays/financeApi.ts", fn: "fetchFinanceDisputes",
    path: () => `${S}/finance/disputes`,
    params: { page: 1, limit: 20 },
    check: listProbe(RAW.disputeRaw, "disputes"),
  },
  {
    id: "payout-methods", module: "stays/financeApi.ts", fn: "fetchPayoutMethods",
    path: () => `${S}/payout-methods/me`,
    check: listProbe(RAW.payoutMethod, "methods"),
  },
  {
    id: "refund-claims", module: "stays/financeApi.ts", fn: "fetchSupplierClaims",
    path: () => `${S}/refund-claims/supplier`,
    check: listProbe(RAW.claimRaw, "claims"),
  },

  // ── features/stays/customersApi.ts ────────────────────────────────────────
  {
    id: "conversations", module: "stays/customersApi.ts", fn: "listStaysConversations",
    path: () => `${S}/conversations`,
    params: { domain: "stays" },
    check: listProbe(RAW.conversation, "conversations", "conversationId"),
  },
  {
    id: "conversation-messages", module: "stays/customersApi.ts", fn: "listStaysConversationMessages",
    path: (ctx) => (ctx.conversationId ? `${S}/conversations/${ctx.conversationId}/messages` : null),
    params: { limit: 20 },
    check: (body) => {
      const page = data(body);
      return {
        issues: [
          ...checkShape(page, RAW.messagePage, "data"),
          ...checkList(page.messages, RAW.message, "data.messages[]"),
        ],
        rows: count(page.messages),
      };
    },
  },

  // ── features/stays/verification/api.ts, notifications/api.ts ──────────────
  {
    id: "verification", module: "stays/verification/api.ts", fn: "loadStaysVerification",
    path: () => `${S}/verification`,
    check: (body) => ({ issues: checkShape(data(body), RAW.verification, "data") }),
  },
  {
    id: "notifications", module: "stays/notifications/api.ts", fn: "fetchStaysNotifications",
    path: () => `${S}/notifications`,
    params: { domain: "stays", limit: 20 },
    check: listProbe(RAW.notification, "notifications"),
  },

  // ── features/stays/settingsApi.ts ─────────────────────────────────────────
  {
    id: "current-user", module: "stays/settingsApi.ts", fn: "fetchCurrentUser",
    path: () => "/users/me",
    check: (body) => ({ issues: checkShape(data(body).user, RAW.user, "data.user") }),
  },
  {
    id: "business-profile", module: "stays/settingsApi.ts", fn: "fetchBusinessProfile",
    path: () => "/suppliers/settings/business-profile",
    check: (body) => ({ issues: checkShape(data(body), RAW.businessProfile, "data") }),
  },
  {
    id: "notification-preferences", module: "stays/settingsApi.ts", fn: "fetchNotificationPreferences",
    path: () => "/suppliers/settings/notification-preferences",
    check: (body) => ({ issues: checkShape(data(body), RAW.notificationPreferences, "data") }),
  },
  {
    id: "notification-recipients", module: "stays/settingsApi.ts", fn: "fetchNotificationRecipients",
    path: () => "/suppliers/settings/notification-recipients",
    check: listProbe(RAW.recipient, "recipients"),
  },
  {
    id: "tax-info", module: "stays/settingsApi.ts", fn: "fetchTaxInfo",
    path: () => "/suppliers/settings/tax-info",
    // The Tax tab reads `data.taxInfo.*`.
    check: (body) => ({ issues: checkShape(data(body), RAW.taxInfo, "data") }),
  },
  {
    id: "payouts", module: "stays/settingsApi.ts", fn: "fetchPayouts",
    path: () => "/payouts/me",
    params: { limit: 10 },
    check: listProbe(RAW.payoutRaw, "payouts"),
  },
  {
    id: "team-members", module: "stays/settingsApi.ts", fn: "fetchTeamMembers",
    path: () => "/suppliers/settings/team/members",
    check: listProbe(RAW.teamMember, "members"),
  },
];

export type ProbeOutcome = "ok" | "shape-mismatch" | "unavailable" | "error" | "skipped";

export type ProbeResult = {
  id: string;
  module: string;
  fn: string;
  path: string | null;
  url: string | null;
  status: number | null;
  ms: number | null;
  outcome: ProbeOutcome;
  rows?: number;
  issues: ShapeIssue[];
  /** Informational only (e.g. non-USD currencies — multi-currency is allowed). */
  notes: string[];
  error?: string;
};

/**
 * Run every probe in order, GET only. Reports contain status codes, field
 * names and row counts — never response bodies — so the exported JSON holds
 * no guest or business data.
 */
export async function runProbes(
  probes: Probe[] = PROBES,
  onResult?: (result: ProbeResult, index: number) => void,
): Promise<ProbeResult[]> {
  const ctx: ProbeContext = {};
  const results: ProbeResult[] = [];

  for (const [index, probe] of probes.entries()) {
    const path = probe.path(ctx);
    const base = { id: probe.id, module: probe.module, fn: probe.fn, path, url: path && rewriteSupplierPath(path) };
    let result: ProbeResult;

    if (!path) {
      result = { ...base, status: null, ms: null, outcome: "skipped", issues: [], notes: ["Skipped: needs an id from an earlier probe that returned no rows."] };
    } else {
      const started = performance.now();
      try {
        const res: AxiosResponse<Body> = await api.get(path, {
          params: probe.params,
          skipGlobalErrorHandler: true,
          skipRetry: true,
        });
        const ms = Math.round(performance.now() - started);
        const { issues, rows } = probe.check(res.data, ctx);
        const currencies = [...collectCurrencies(res.data)].filter((code) => code !== DEFAULT_REPORT_CURRENCY);
        result = {
          ...base,
          status: res.status,
          ms,
          rows,
          outcome: issues.length ? "shape-mismatch" : "ok",
          issues,
          notes: currencies.length ? [`Non-USD currencies present: ${currencies.join(", ")}`] : [],
        };
      } catch (error) {
        const ms = Math.round(performance.now() - started);
        const err = error as { response?: { status?: number }; code?: string; message?: string };
        result = {
          ...base,
          status: err.response?.status ?? null,
          ms,
          outcome: isNotAvailable(error) ? "unavailable" : "error",
          issues: [],
          notes: [],
          error: err.code === "AUTH_REQUIRED" ? "Not signed in" : err.message || "Request failed",
        };
      }
    }

    results.push(result);
    onResult?.(result, index);
  }

  return results;
}

export function summarize(results: ProbeResult[]) {
  const by = (outcome: ProbeOutcome) => results.filter((r) => r.outcome === outcome).length;
  return {
    total: results.length,
    ok: by("ok"),
    shapeMismatch: by("shape-mismatch"),
    unavailable: by("unavailable"),
    error: by("error"),
    skipped: by("skipped"),
  };
}
