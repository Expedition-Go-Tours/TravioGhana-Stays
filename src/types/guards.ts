/**
 * Runtime shape checks for API responses.
 *
 * Hand-written on purpose (no schema library): they only answer "does this
 * payload carry the fields our mapping code reads, with the right kind of
 * value?" — enough for the dev API status page to say which endpoints match
 * the contract in `types/stays.ts` and which need a mapping fix.
 *
 * A spec maps a dotted field path to the kind of value expected. A trailing
 * `?` makes the field optional (checked only when present).
 */
export type FieldKind = "string" | "number" | "boolean" | "array" | "object" | "numeric" | "any";
export type FieldSpec = Record<string, FieldKind | `${FieldKind}?`>;

export type ShapeIssue = { path: string; problem: string };

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matches(value: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case "any":
      return value !== undefined;
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    // Money fields arrive as numbers or decimal strings ("29.00"); both map fine.
    case "numeric":
      return (
        (typeof value === "number" && Number.isFinite(value)) ||
        (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
      );
    default:
      return typeof value === kind;
  }
}

function read(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Every field in `spec` that is missing or of the wrong kind on `value`. */
export function checkShape(value: unknown, spec: FieldSpec, prefix = ""): ShapeIssue[] {
  if (value === null || typeof value !== "object") {
    return [{ path: prefix || "(root)", problem: `expected an object, got ${kindOf(value)}` }];
  }
  const issues: ShapeIssue[] = [];
  for (const [path, rawKind] of Object.entries(spec)) {
    const optional = rawKind.endsWith("?");
    const kind = (optional ? rawKind.slice(0, -1) : rawKind) as FieldKind;
    const field = read(value, path);
    const fullPath = prefix ? `${prefix}.${path}` : path;
    if (field === undefined || field === null) {
      if (!optional) issues.push({ path: fullPath, problem: "missing" });
      continue;
    }
    if (!matches(field, kind)) {
      issues.push({ path: fullPath, problem: `expected ${kind}, got ${kindOf(field)}` });
    }
  }
  return issues;
}

/**
 * Check every row of a list (at most `limit` rows, issues de-duplicated so a
 * 50-row response with one renamed field reports one issue, not fifty).
 */
export function checkList(rows: unknown, spec: FieldSpec, prefix = "[]", limit = 25): ShapeIssue[] {
  if (!Array.isArray(rows)) return [{ path: prefix, problem: `expected an array, got ${kindOf(rows)}` }];
  const seen = new Map<string, ShapeIssue>();
  for (const row of rows.slice(0, limit)) {
    for (const issue of checkShape(row, spec, prefix)) {
      seen.set(`${issue.path}|${issue.problem}`, issue);
    }
  }
  return [...seen.values()];
}

/** Every distinct `currency` value found anywhere in a payload (depth-limited). */
export function collectCurrencies(value: unknown, depth = 6, found = new Set<string>()): Set<string> {
  if (depth < 0 || value === null || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) collectCurrencies(item, depth - 1, found);
    return found;
  }
  for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
    if (key === "currency" && typeof field === "string" && field) found.add(field.toUpperCase());
    else collectCurrencies(field, depth - 1, found);
  }
  return found;
}

/* ── Raw API contracts ───────────────────────────────────────────────────────
 * The fields each API module's live branch reads from the response. When the
 * backend renames one of these, the page silently shows "—" or 0; these specs
 * make that visible. */

export const RAW = {
  dashboard: {
    stats: "object",
    "stats.upcomingArrivals": "number",
    "stats.newReservations": "number",
    "stats.liveProperties": "number",
    "stats.grossBookingValue": "numeric",
    currency: "string",
    cancellation: "object",
    actionRequired: "object",
    recentBookings: "array",
    topProperties: "array",
  },
  property: {
    id: "string",
    name: "string",
    status: "string",
    city: "string?",
    photos: "array",
    rooms: "array",
    ratePlans: "array?",
    currency: "string?",
    pricePerNight: "numeric?",
  },
  booking: {
    id: "string",
    guest: "string",
    propertyId: "string",
    room: "string?",
    from: "string",
    to: "string",
    amount: "numeric",
    status: "string",
    guests: "number?",
    currency: "string?",
  },
  availability: { overrides: "object", currency: "string?" },
  offer: {
    id: "string",
    name: "string",
    offerType: "string",
    discountType: "string",
    startDate: "string",
    endDate: "string",
    isActive: "boolean",
    targets: "array",
  },
  review: { id: "string", guest: "string", rating: "number", text: "string", reply: "string?" },
  cancellationSummary: {
    cancellationRate: "number",
    eligibleBookings: "number",
    cancelled: "number",
    status: "string",
  },
  cancellationRecord: { id: "string", bookingReference: "string", bookingValue: "numeric", reason: "string" },
  analyticsSummary: {
    "properties.active": "number",
    "properties.total": "number",
    "bookings.total": "number",
    "earnings.totalEarnings": "numeric",
    "reviews.averageRating": "number",
  },
  propertyAnalytics: { propertyId: "string", name: "string", bookings: "number", revenue: "numeric" },
  monthlyRevenue: { month: "string", revenue: "numeric" },
  financeSummary: {
    currency: "string",
    "availableBalance.amount": "numeric",
    "pendingClearance.amount": "numeric",
    "inReview.total": "numeric",
    "paidOut.total": "numeric",
    payoutPlan: "object?",
  },
  // financeApi maps these raw names (platformCommission → commissionAmount, …).
  earningRaw: {
    id: "string",
    bookingNumber: "string",
    travelDate: "string",
    grossAmount: "numeric",
    supplierPayout: "numeric",
    platformCommission: "numeric",
    currency: "string",
    payoutStatus: "string",
    "property.name": "string",
  },
  payoutRequestRaw: {
    id: "string",
    requestNumber: "string",
    amount: "numeric",
    currency: "string",
    status: "string",
    createdAt: "string",
    "payoutMethod.type": "string?",
  },
  payoutSettings: { cycle: "string?", options: "array?", nextRunAt: "string?" },
  chargeRaw: { id: "string", amount: "numeric", currency: "string", status: "string", bookingId: "string?" },
  disputeRaw: {
    id: "string",
    disputeNumber: "string",
    status: "string",
    reason: "string",
    "booking.bookingNumber": "string",
    "booking.property.name": "string?",
    "booking.currency": "string",
  },
  payoutMethod: { id: "string", type: "string", currency: "string", country: "string?", status: "string?" },
  claimRaw: {
    id: "string",
    claimNumber: "string",
    status: "string",
    type: "string",
    "booking.bookingNumber": "string",
    "booking.grossAmount": "numeric",
    "booking.currency": "string",
  },
  conversation: { id: "string", updatedAt: "string", participants: "array", messages: "array?" },
  messagePage: { messages: "array", hasMore: "boolean?", cursor: "any?" },
  message: { id: "string", senderId: "string", content: "string", createdAt: "string" },
  notification: { id: "string", type: "string", title: "string?", message: "string?", createdAt: "string" },
  verification: { profile: "object", "profile.documents": "array", requirements: "object?" },
  user: { id: "string?", name: "string", email: "string" },
  businessProfile: { businessInfo: "object" },
  taxInfo: { taxInfo: "object", "taxInfo.taxId": "string?", "taxInfo.taxCountry": "string?" },
  notificationPreferences: { emailNotifications: "object", pushNotifications: "object?" },
  object: {},
  teamMember: { id: "string", email: "string", roles: "array?", status: "string" },
  recipient: { id: "string", email: "string", status: "string" },
  payoutRaw: { id: "string", amount: "numeric", status: "string", currency: "string" },
} satisfies Record<string, FieldSpec>;
