/**
 * Domain types for the Stays workspace.
 *
 * Derived from the mock dataset (`features/stays/mock/seed.ts`), the mock
 * store's return shapes (`features/stays/mock/store.ts`) and the response
 * mapping in the API modules. The mock mirrors the live API function for
 * function, so these are the contract both sides must satisfy.
 *
 * Shapes the live API has not confirmed yet are marked optional; tighten them
 * once the API status report (dev page `/stays/dev/api-status`) is in.
 */

/* ── Shared ───────────────────────────────────────────────────────────────── */

/** ISO 4217 code ("USD", "GHS", "EUR", …). USD is the workspace default. */
export type CurrencyCode = string;

/** `YYYY-MM-DD` (bookings and stay dates). */
export type ISODate = string;

/** Full ISO-8601 instant. */
export type ISODateTime = string;

export type Pagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
};

export type Paginated<K extends string, T> = { [key in K]: T[] } & { pagination: Pagination | null };

export type OkResponse = { ok: true };

/* ── Properties ───────────────────────────────────────────────────────────── */

export type PropertyStatus = "Live" | "Draft" | "Under review" | "Paused";

export type RoomType = {
  id: string;
  kind: string;
  name: string;
  count: number;
  adults: number;
  children: number;
  beds: string;
  size: number | string;
  price: number;
  weekend?: number;
  bathroom?: string;
  bathroomAmenities?: string[];
  amenities?: string[];
  meal?: string;
};

export type RatePlan = {
  id: string;
  roomId: string;
  name: string;
  pricingModel: string;
  price: number;
  weekend: number;
  adjustmentPct: number;
  meal: string;
  cancellation: string;
  freeCancellationHours: number;
  penalty: string;
  noShow: string;
  bookingCutoffHours: number;
  latestBookingTime: string;
  maxAdvanceDays: number;
  minStay: number;
  maxStay: number;
  baseGuests: number;
  singleGuestDiscount: number;
  extraAdult: number;
  extraChild: number;
  closedArrival: boolean;
  closedDeparture: boolean;
  includesTaxes: string;
};

export type Bedroom = { id: string; name: string; doubleBeds: number; singleBeds: number };

export type HostProfileSection = { included: boolean; about: string; name?: string };

export type Property = {
  id: string;
  name: string;
  type: string;
  bookingType: string;
  operating: string;
  region: string;
  country: string;
  city: string;
  address: string;
  apartment: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  mapAddress: string;
  gps: string;
  landmark: string;
  shortDescription: string;
  description: string;
  status: PropertyStatus;
  /** Last completed builder step (0 = not started). */
  step: number;
  facilities: string[];
  /** Absolute URLs, or data URLs for photos added in mock mode. */
  photos: string[];
  rooms: RoomType[];
  ratePlans: RatePlan[];
  start: string;
  advance: string;
  checkin: string;
  checkinEnd: string;
  checkoutStart: string;
  checkout: string;
  cancellation: string;
  listingScope: string;
  sameAddress: boolean | null;
  propertyCount: number | null;
  otherListings: unknown[];
  noOtherListings: boolean;
  channelManager: { connected: boolean; name: string };
  services: { breakfast: string; parking: string };
  languages: string[];
  hostProfile: {
    property: HostProfileSection;
    host: HostProfileSection & { name: string };
    neighbourhood: HostProfileSection;
    none: boolean;
  };
  sleeping: { bedrooms: Bedroom[]; livingRoomBeds: number; otherSpacesBeds: number };
  maxGuests: number;
  excludeInfants: boolean;
  bathrooms: number;
  children: string;
  cots: string;
  size: string;
  sizeUnit: string;
  bookingPreference: string;
  /** Decimal string as entered in the price step. */
  pricePerNight: string;
  currency: CurrencyCode;
  promotion: boolean;
  startMode: string;
  calendarWindow: string;
  calendarImport: { mode: string; url: string };
  longStays: unknown;
  payments: { mode: string };
  invoicing: { name: string; legalName: string; sameAddress: boolean; address: string };
  agreement: { certifyBusiness: boolean; certifyTerms: boolean; openMonths: string; notReadyReason: string };
};

/** A row of `listProperties` — the property plus its booking count. */
export type PropertyListItem = Property & { bookings: number };

/* ── Availability ─────────────────────────────────────────────────────────── */

export type AvailabilityOverride = {
  price?: number;
  count?: number;
  closed?: boolean;
  minStay?: number;
};

export type Availability = {
  /** Keyed `${roomId}|${YYYY-MM-DD}`. */
  overrides: Record<string, AvailabilityOverride>;
  currency: CurrencyCode;
};

/* ── Bookings ─────────────────────────────────────────────────────────────── */

export type BookingStatus =
  | "New"
  | "Confirmed"
  | "Checked in"
  | "Completed"
  | "Cancelled"
  | "No-show";

export type Booking = {
  id: string;
  guest: string;
  guestEmail?: string;
  guestPhone?: string;
  propertyId: string;
  room: string;
  from: ISODate;
  to: ISODate;
  amount: number;
  /** Absent in the mock (always the workspace default); the live API may send it. */
  currency?: CurrencyCode;
  status: BookingStatus;
  guests: number;
  reason?: string;
  note?: string;
  refundAmount?: number | null;
  /** Supplier-caused cancellations count toward the rate; guest-requested ones and no-shows do not. */
  countsTowardRate?: boolean;
};

export type BookingListItem = Booking & { propertyName: string };

/* ── Offers ───────────────────────────────────────────────────────────────── */

export type OfferType = "LIMITED_TIME" | "EARLY_BIRD" | "LAST_MINUTE" | (string & {});
export type OfferStatus = "active" | "scheduled" | "expired" | "paused" | (string & {});

export type OfferTarget = {
  propertyId: string;
  propertyName: string;
  roomId: string | null;
  roomLabel: string | null;
};

export type Offer = {
  id: string;
  name: string;
  offerType: OfferType;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountPercentage: number;
  fixedDiscountValue: number | null;
  startDate: ISODateTime;
  endDate: ISODateTime;
  isActive: boolean;
  capacityType: "UNLIMITED" | "CAPPED";
  maxSpots: number | null;
  spotsSold: number;
  timeSlotMode: "ALL_DAYS" | "SPECIFIC_WEEKDAYS";
  specificWeekdays: string[];
  earlyBirdAdvanceDays: number;
  lastMinuteWindowHours: number;
  promoCode: string;
  minQuantity: number | null;
  minSpendAmount: number | null;
  maxRedemptionsPerCustomer: number | null;
  stackable: boolean;
  targets: OfferTarget[];
};

/** Offers as returned by list/get/save: with derived status and display name. */
export type OfferWithStatus = Offer & { status: OfferStatus; propertyName: string };

/* ── Reviews ──────────────────────────────────────────────────────────────── */

export type Review = {
  id: string;
  guest: string;
  /** 1–5 stars in the mock; the Booking-style score badge shows it on a 10 scale. */
  rating: number;
  text: string;
  reply: string;
};

/* ── Guest messaging ──────────────────────────────────────────────────────── */

export type ChatUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  roles?: string[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: Pick<ChatUser, "id" | "name">;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: ISODateTime;
};

export type Conversation = {
  id: string;
  type: "SUPPLIER_CUSTOMER" | (string & {});
  updatedAt: ISODateTime;
  unreadCount: number;
  participants: { userId: string; user: ChatUser; lastReadAt: ISODateTime | null }[];
  /** List responses carry only the latest message; the thread endpoint carries the rest. */
  messages: Message[];
};

export type MessagePage = { messages: Message[]; cursor: string | null; hasMore: boolean };

/* ── Notifications ────────────────────────────────────────────────────────── */

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: ISODateTime;
};

export type NotificationList = { notifications: Notification[]; unreadCount: number };

/* ── Verification ─────────────────────────────────────────────────────────── */

export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REPLACEMENT_REQUESTED" | (string & {});

export type VerificationDocument = {
  id: string;
  type: string;
  ownerType: "SUPPLIER" | "PROPERTY" | (string & {});
  ownerId: string | null;
  status: DocumentStatus;
  url: string;
  fileName: string | null;
  expiryDate: ISODate | null;
  reviewNote: string | null;
  uploadedAt: ISODateTime;
};

export type DocumentRequirement = {
  type: string;
  label: string;
  detail: string;
  required: boolean;
  timing: string;
  enforced?: boolean;
  ownerType?: string;
};

export type Verification = {
  profile: {
    supplierType?: string;
    documents: VerificationDocument[];
    properties: { id: string; name: string; city?: string; region?: string; status: string }[];
  };
  requirements: {
    documents: DocumentRequirement[];
    propertyDocuments: DocumentRequirement[];
    properties: string;
    vehicles: string;
    guides: string;
    documentationGraceDays: number;
    documentationDeadline: ISODateTime;
  } | null;
};

/* ── Finance ──────────────────────────────────────────────────────────────── */

export type EarningPayoutStatus = "ELIGIBLE" | "PENDING" | "REQUESTED" | "PAID" | "DISPUTED" | "CANCELLED" | "FAILED";

export type Earning = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  travelDate: ISODate;
  stayDate?: ISODate;
  paidAt: ISODate | null;
  grossAmount: number;
  supplierPayout: number;
  commissionAmount: number;
  commissionRate: number;
  currency: CurrencyCode;
  payoutStatus: EarningPayoutStatus;
  status: string;
  property: string;
  room?: string;
  customer?: string;
  payoutRequest: unknown;
  openDispute: { disputeNumber: string } | null;
};

export type PayoutRequestStatus = "IN_REVIEW" | "APPROVED" | "COMPLETED" | "PAID" | "REJECTED" | "CANCELLED" | "FAILED" | "PENDING";

export type PayoutRequest = {
  id: string;
  requestNumber: string;
  amount: number;
  currency: CurrencyCode;
  bookingCount: number;
  status: PayoutRequestStatus;
  cycleLabel?: string;
  reference?: string;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
  rejectedReason?: string;
  autoGenerated?: boolean;
  method?: string;
};

export type PayoutMethod = {
  id: string;
  type: string;
  isDefault?: boolean;
  verified: boolean;
  status: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  sortCode?: string;
  routingNumber?: string;
  mobileNumber?: string;
  country: string;
  /** The currency the bank account receives — can differ from booking currency. */
  currency: CurrencyCode;
  createdAt: ISODateTime;
};

export type PayoutCycle = "WEEKLY" | "TWICE_MONTHLY" | "MONTHLY";

export type PayoutCycleOption = {
  value: PayoutCycle;
  shortLabel: string;
  runDays: string;
  label: string;
  description: string;
};

export type PayoutPlan = {
  cycle?: PayoutCycle;
  pendingCycle?: PayoutCycle | null;
  autoManaged: boolean;
  autoRunsEnabled?: boolean;
  defaultCycle: PayoutCycle;
  scheduleLabel: string;
  nextRunAt: ISODateTime;
  nextRunPeriodLabel: string;
  hasVerifiedPayoutMethod: boolean;
  options: PayoutCycleOption[];
};

type BalanceAmount = { amount: number; bookingCount: number; currency?: CurrencyCode };
type BalanceTotal = { total: number; count: number; requestCount?: number; currency?: CurrencyCode };

export type FinanceCurrencyRow = {
  currency: CurrencyCode;
  availableBalance: BalanceAmount;
  pendingClearance: BalanceAmount;
  inReview: BalanceTotal;
  paidOut: BalanceTotal;
};

export type FinanceSummary = {
  currency: CurrencyCode;
  mixedCurrencies: boolean;
  availableBalance: BalanceAmount;
  pendingClearance: BalanceAmount;
  inReview: BalanceTotal;
  paidOut: BalanceTotal;
  currencies: FinanceCurrencyRow[];
  withdrawalWindow: { open: boolean; opensAt: ISODateTime; closesAt: ISODateTime };
  currentCycle: { label: string };
  payoutPlan: PayoutPlan;
};

export type Charge = {
  id: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  status: "OPEN" | "SETTLED" | "WAIVED";
  notes: string;
  createdAt: ISODateTime;
  settledAt: ISODateTime | null;
  bookingId: string;
  bookingNumber: string;
  payoutRequestId: string | null;
  payoutRequestNumber: string | null;
};

export type ChargeList = { charges: Charge[]; openTotals: { currency: CurrencyCode; amount: number }[] };

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED_CUSTOMER" | "RESOLVED_SUPPLIER" | "WITHDRAWN";

/** A supplier-filed refund request ("dispute" in the API). */
export type Dispute = {
  id: string;
  disputeNumber: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution: string;
  refundAmount: number;
  createdAt: ISODateTime;
  resolvedAt: ISODateTime | null;
  bookingId: string;
  bookingNumber: string;
  propertyTitle: string;
  travelDate: ISODate;
  grossAmount: number;
  currency: CurrencyCode;
};

export type ClaimStatus = "SUBMITTED" | "SUPPLIER_APPROVED" | "SUPPLIER_DECLINED" | "RELEASED" | (string & {});

/** A guest-filed refund claim the supplier approves or declines. */
export type Claim = {
  id: string;
  claimNumber: string;
  type: "FULL" | "PARTIAL";
  status: ClaimStatus;
  reason: string;
  details?: string;
  reviewNote?: string;
  requestedAmount?: number;
  releasedAmount?: number;
  createdAt: ISODateTime;
  booking: {
    bookingNumber: string;
    propertyTitle?: string;
    customerName: string;
    customerEmail?: string;
    total: number;
    currency: CurrencyCode;
  };
};

/* ── Cancellation reporting ───────────────────────────────────────────────── */

export type CancellationSummary = {
  days: number;
  cancellationRate: number;
  eligibleBookings: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  noShowRate: number;
  completionRate: number;
  status: string;
  mostCommonReason: string | null;
  bookingValueLost: number;
};

export type CancellationRecord = {
  id: string;
  travelDate: string;
  reason: string;
  note: string;
  bookingReference: string;
  productName: string;
  bookingValue: number;
  refundAmount: number | null;
  countsTowardRate: boolean | null;
};

/* ── Dashboard & analytics ────────────────────────────────────────────────── */

export type CurrencyTotal = { currency: CurrencyCode; bookings: number; grossBookingValue: number };

export type DashboardSummary = {
  stats: {
    upcomingArrivals: number;
    newReservations: number;
    liveProperties: number;
    grossBookingValue: number;
  };
  currency: CurrencyCode;
  mixedCurrencies: boolean;
  currencies: CurrencyTotal[];
  cancellation: { rate: number; cancelled: number; total: number };
  actionRequired: {
    messagesAwaitingReply: number;
    bookingsToReview: number;
    draftProperties: number;
  };
  recentBookings: BookingListItem[];
  topProperties: {
    id: string;
    name: string;
    bookings: number;
    roomTypes: number;
    revenue: number;
    /** Cover photo URL. Optional: the dashboard falls back to a placeholder tile. */
    photo?: string | null;
  }[];
};

export type AnalyticsSummary = {
  properties: { active: number; total: number };
  bookings: { total: number };
  earnings: {
    totalEarnings: number;
    currency: CurrencyCode;
    mixedCurrencies: boolean;
    currencies: { currency: CurrencyCode; totalEarnings: number; bookings: number }[];
  };
  reviews: { averageRating: number; total: number };
};

export type PropertyAnalytics = {
  propertyId: string;
  name: string;
  bookings: number;
  revenue: number;
  currency: CurrencyCode;
  revenueByCurrency: Record<CurrencyCode, number>;
  photo: string;
};

/** `month` is `YYYY-MM`. */
export type MonthlyRevenue = { month: string; revenue: number };
