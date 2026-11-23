import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Buildings,
  CalendarCheck,
  CalendarDays,
  ChartBar,
  ChatText,
  CheckCircle,
  ChevronRight,
  Home,
  Plus,
  ShieldWarning,
  Ticket,
  TrendingUp,
  Wallet,
} from "@/features/stays/icons";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  StatCard,
  UnavailableState,
} from "@/components/ui";
import Skeleton from "@/components/shared/Skeleton";
import { canOpenPath } from "@/config/pageAccess";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { useTeamRole } from "@/hooks/useTeamRole";
import { formatMoney } from "@/lib/money";
import { queryStatus } from "@/lib/queryState";
import { TONE_CLASSES, type Tone } from "@/lib/statusTones";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { BookingListItem, DashboardSummary } from "@/types/stays";
import StaysPageHeader from "../components/StaysPageHeader";
import { fetchStaysDashboard, STAYS_KEYS, staysUsesMockData } from "../api";
import { loadStaysVerification } from "../verification/api";
import { verificationActionCount, type VerificationPayload } from "../verification/actions";
import { ReservationCard } from "../components/bookings/BookingParts";
import { reservationColumns } from "../components/bookings/reservationColumns";

/**
 * The Stays landing page: what needs doing today, the four headline numbers,
 * the latest reservations, the best-performing properties and the
 * cancellation rate. Everything comes from `GET /stays/supplier/dashboard`
 * (the mock dataset in mock mode); the verification to-do reads the same
 * payload as the Verification page, and only for people who can open it.
 */

type CanOpen = (path: string) => boolean;

/** Main column plus a fixed side column, from xl up. */
const SIDE_COLUMN = "xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function greetingFor(date: Date, name: string | null): string {
  const hour = date.getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

const todayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

function firstName(name: string | null | undefined): string | null {
  const first = String(name ?? "").trim().split(/\s+/)[0];
  return first || null;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** Same bands and wording as the Cancellation page (`getCancellationSummary`). */
function cancellationBand(rate: number, total: number): { label: string; tone: Tone } {
  if (total < 10) return { label: "Building your record", tone: "neutral" };
  if (rate <= 1) return { label: "Excellent", tone: "success" };
  if (rate <= 2) return { label: "Good", tone: "success" };
  if (rate <= 5) return { label: "Needs attention", tone: "warning" };
  return { label: "High", tone: "danger" };
}

const number = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function StaysDashboardPage() {
  const { hasPermission } = useTeamRole();
  const canOpen: CanOpen = (path) => canOpenPath(hasPermission, path);
  const user = useAuthStore((state) => state.user);
  const supplierProfile = useAuthStore((state) => state.supplierProfile);

  const dashboard = useQuery({
    queryKey: STAYS_KEYS.dashboard,
    queryFn: fetchStaysDashboard,
    staleTime: 30_000,
  });

  const canVerify = canOpen("/stays/verification");
  const verification = useQuery({
    queryKey: ["stays", "verification"],
    queryFn: () => loadStaysVerification() as Promise<VerificationPayload>,
    enabled: canVerify,
    staleTime: 60_000,
  });

  const now = new Date();
  const businessName = supplierProfile?.businessName?.trim() || null;
  const status = queryStatus(dashboard);

  const header = (
    <StaysPageHeader
      title={greetingFor(now, firstName(user?.name))}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="max-sm:w-full">{todayFormatter.format(now)}</span>
          {businessName && (
            <>
              <span aria-hidden="true" className="text-subtle max-sm:hidden">
                ·
              </span>
              <span className="min-w-0 truncate">{businessName}</span>
            </>
          )}
          {staysUsesMockData && (
            <Badge tone="info" className="ml-1">
              Demo data
            </Badge>
          )}
        </span>
      }
      actions={
        canOpen("/stays/properties/build") && (
          <Button asChild variant="primary">
            <Link to="/stays/properties/build">
              <Plus size={16} weight="bold" aria-hidden="true" />
              List a property
            </Link>
          </Button>
        )
      }
    />
  );

  if (status === "loading") {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div>
        {header}
        <Card>
          <UnavailableState feature="Your stays overview" />
        </Card>
      </div>
    );
  }

  if (status === "error" || !dashboard.data) {
    return (
      <div>
        {header}
        <Card>
          <ErrorState
            title="We couldn't load your dashboard"
            onRetry={() => void dashboard.refetch()}
            retrying={dashboard.isFetching}
          />
        </Card>
      </div>
    );
  }

  const data = dashboard.data;
  const verificationCount = canVerify ? verificationActionCount(verification.data) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {header}

      {/* Phones read the to-do list first; from xl it sits beside a 2×2 of KPI tiles. */}
      <div className={cn("grid grid-cols-1 gap-4 sm:gap-6", SIDE_COLUMN)}>
        <ThingsToDo
          className="xl:col-start-2 xl:row-start-1"
          data={data}
          verificationCount={verificationCount}
          canOpen={canOpen}
        />
        <KpiGrid className="xl:col-start-1 xl:row-start-1" data={data} />
      </div>

      <RecentReservations bookings={data.recentBookings ?? []} currency={data.currency} canOpen={canOpen} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <TopProperties
          className="md:col-span-2"
          properties={data.topProperties ?? []}
          currency={data.currency}
          canOpen={canOpen}
        />
        <CancellationCard cancellation={data.cancellation} canOpen={canOpen} />
        <Shortcuts canOpen={canOpen} />
      </div>
    </div>
  );
}

/* ── KPIs ────────────────────────────────────────────────────────────────── */

function KpiGrid({ data, className }: { data: DashboardSummary; className?: string }) {
  const stats = data.stats;
  const gross = number(stats?.grossBookingValue);
  const currencies = Array.isArray(data.currencies) ? data.currencies : [];

  return (
    <section
      aria-label="Key figures"
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-2 xl:gap-6", className)}
    >
      <StatCard
        icon={<CalendarDays size={18} />}
        label="Upcoming arrivals"
        value={number(stats?.upcomingArrivals).toLocaleString("en-US")}
        hint="Active reservations"
      />
      <StatCard
        icon={<Ticket size={18} />}
        tone="warning"
        label="New reservations"
        value={number(stats?.newReservations).toLocaleString("en-US")}
        hint="Waiting for you"
      />
      <StatCard
        icon={<Home size={18} />}
        tone="info"
        label="Live properties"
        value={number(stats?.liveProperties).toLocaleString("en-US")}
        hint="Open for booking"
      />
      <StatCard
        icon={<TrendingUp size={18} />}
        tone="success"
        label="Booking value"
        value={<Money amount={gross} currency={data.currency} compact={gross >= 10_000} />}
        hint={
          currencies.length > 1
            ? currencies.map((row) => formatMoney(row.grossBookingValue, row.currency)).join(" · ")
            : "Net of cancellations"
        }
      />
    </section>
  );
}

/* ── Things to do ────────────────────────────────────────────────────────── */

type Task = { key: string; to: string; icon: ReactNode; title: string; count: number; busy: string; clear: string };

function ThingsToDo({
  data,
  verificationCount,
  canOpen,
  className,
}: {
  data: DashboardSummary;
  verificationCount: number;
  canOpen: CanOpen;
  className?: string;
}) {
  const action = data.actionRequired;
  const tasks: Task[] = [
    {
      key: "messages",
      to: "/stays/customers",
      icon: <ChatText size={18} />,
      title: "Guest messages",
      count: number(action?.messagesAwaitingReply),
      busy: "unread",
      clear: "No unread messages",
    },
    {
      key: "bookings",
      to: "/stays/bookings",
      icon: <CalendarCheck size={18} />,
      title: "New reservations",
      count: number(action?.bookingsToReview),
      busy: "to confirm",
      clear: "Nothing to review",
    },
    {
      key: "drafts",
      to: "/stays/properties",
      icon: <Buildings size={18} />,
      title: "Unfinished listings",
      count: number(action?.draftProperties),
      busy: "draft to finish",
      clear: "Every listing is complete",
    },
    // Only listed when something is wrong: there is no "all good" line for it.
    ...(verificationCount > 0
      ? [
          {
            key: "verification",
            to: "/stays/verification",
            icon: <ShieldWarning size={18} />,
            title: "Verification documents",
            count: verificationCount,
            busy: "need attention",
            clear: "",
          },
        ]
      : []),
  ].filter((task) => canOpen(task.to));

  const open = tasks.reduce((total, task) => total + (task.count > 0 ? 1 : 0), 0);

  return (
    <Card padding="none" as="section" aria-labelledby="dashboard-todo" className={cn("p-5", className)}>
      <CardHeader
        className="mb-2"
        title={<span id="dashboard-todo">Things to do</span>}
        actions={open > 0 ? <Badge tone="warning">{plural(open, "open", "open")}</Badge> : null}
      />
      {tasks.length === 0 || open === 0 ? (
        <div className="flex items-center gap-3 rounded-control bg-success-soft px-4 py-3 text-sm font-medium text-success">
          <CheckCircle size={20} weight="fill" aria-hidden="true" />
          You're all caught up.
        </div>
      ) : null}
      {tasks.length > 0 && (
        <ul className="-mx-2 mt-1 md:grid md:grid-cols-2 md:gap-x-6 xl:block">
          {tasks.map((task) => {
            const pending = task.count > 0;
            return (
              <li key={task.key}>
                <Link
                  to={task.to}
                  className={cn(
                    "group flex min-h-14 items-center gap-3 rounded-control px-2 py-2.5 transition-colors",
                    "hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      pending ? TONE_CLASSES.warning.chip : TONE_CLASSES.neutral.chip,
                    )}
                  >
                    {task.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{task.title}</span>
                    <span className={cn("block text-caption", pending ? "text-warning" : "text-muted")}>
                      {pending ? `${task.count.toLocaleString("en-US")} ${task.busy}` : task.clear}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── Recent reservations ─────────────────────────────────────────────────── */

function RecentReservations({
  bookings,
  currency,
  canOpen,
  className,
}: {
  bookings: BookingListItem[];
  currency: DashboardSummary["currency"];
  canOpen: CanOpen;
  className?: string;
}) {
  const navigate = useNavigate();
  const canOpenBookings = canOpen("/stays/bookings");
  // Below xl the card is too narrow for five columns; the property moves
  // under the stay dates instead.
  const roomy = useBreakpoint("xl");

  const columns = reservationColumns({ roomy, currency });

  return (
    <Card
      padding="none"
      as="section"
      aria-labelledby="dashboard-recent"
      // Phones: the rows are cards already, so the section drops its own frame (no card-in-card).
      className={cn("min-w-0 pb-2 max-md:border-0 max-md:bg-transparent max-md:pb-0 max-md:shadow-none", className)}
    >
      <CardHeader
        className="mb-1 flex-nowrap px-5 pt-5 max-md:mb-3 max-md:px-1 max-md:pt-2"
        title={<span id="dashboard-recent">Recent reservations</span>}
        description="The latest bookings across your properties"
        actions={
          canOpenBookings && (
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/stays/bookings">
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Button>
          )
        }
      />
      <DataTable
        className="px-1 max-md:px-0"
        ariaLabel="Recent reservations"
        columns={columns}
        rows={bookings}
        onRowClick={canOpenBookings ? (booking) => navigate(`/stays/bookings?bookingId=${encodeURIComponent(booking.id)}`) : undefined}
        rowLabel={(booking) => `Open booking ${booking.id} for ${booking.guest}`}
        empty={
          <EmptyState
            compact
            icon={<Ticket size={22} />}
            title="No reservations yet"
            description="New bookings will show up here as soon as guests book."
          />
        }
        renderCard={(booking) => <ReservationCard booking={booking} currency={currency} />}
      />
    </Card>
  );
}

/* ── Cancellation ────────────────────────────────────────────────────────── */

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function CancellationCard({
  cancellation,
  canOpen,
  className,
}: {
  cancellation: DashboardSummary["cancellation"] | undefined;
  canOpen: CanOpen;
  className?: string;
}) {
  const rate = Math.min(100, Math.max(0, number(cancellation?.rate)));
  const total = number(cancellation?.total);
  const cancelled = number(cancellation?.cancelled);
  const band = cancellationBand(rate, total);
  const rateLabel = `${rate.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

  return (
    <Card padding="none" as="section" aria-labelledby="dashboard-cancellation" className={cn("p-5", className)}>
      <CardHeader className="mb-3" title={<span id="dashboard-cancellation">Cancellation rate</span>} />
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="10" stroke="currentColor" className="text-surface-strong" />
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="currentColor"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - rate / 100)}
              className={cn(TONE_CLASSES[band.tone].text, "transition-[stroke-dashoffset] duration-700")}
            />
          </svg>
          <span className="figures absolute inset-0 flex items-center justify-center text-xl font-bold text-ink">{rateLabel}</span>
        </div>
        <div className="min-w-0 space-y-2">
          <Badge tone={band.tone} dot>
            {band.label}
          </Badge>
          <p className="text-sm text-muted">
            {total > 0
              ? `${plural(cancelled, "cancellation", "cancellations")} out of ${plural(total, "reservation", "reservations")}`
              : "No reservations yet"}
          </p>
          {canOpen("/stays/cancellation") && (
            <Button asChild variant="link" size="sm">
              <Link to="/stays/cancellation">
                View details
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Top properties ──────────────────────────────────────────────────────── */

const THUMB = "h-11 w-11 shrink-0 rounded-lg sm:h-12 sm:w-16";

function PropertyThumb({ photo, name }: { photo?: string | null; name: string }) {
  if (photo) {
    return <img src={photo} alt="" loading="lazy" className={cn(THUMB, "object-cover")} />;
  }
  return (
    <span aria-hidden="true" title={name} className={cn(THUMB, "flex items-center justify-center bg-brand-soft text-brand-ink")}>
      <Buildings size={20} />
    </span>
  );
}

function TopProperties({
  properties,
  currency,
  canOpen,
  className,
}: {
  properties: DashboardSummary["topProperties"];
  currency: DashboardSummary["currency"];
  canOpen: CanOpen;
  className?: string;
}) {
  const canView = canOpen("/stays/properties");

  return (
    <Card padding="none" as="section" aria-labelledby="dashboard-top" className={cn("min-w-0 p-5", className)}>
      <CardHeader
        className="mb-2 flex-nowrap"
        title={<span id="dashboard-top">Top properties</span>}
        description="Ranked by number of bookings"
        actions={
          canView && (
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/stays/properties">
                All properties
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Button>
          )
        }
      />
      {properties.length === 0 ? (
        <EmptyState
          compact
          icon={<Buildings size={22} />}
          title="No properties yet"
          description="List your first property to start taking bookings."
        />
      ) : (
        <ol className="-mx-2 lg:grid lg:grid-cols-2 lg:gap-x-6">
          {properties.map((property, index) => {
            const body = (
              <>
                <span className="figures w-4 shrink-0 text-center text-sm font-bold text-subtle max-sm:hidden">
                  {index + 1}
                </span>
                <PropertyThumb photo={property.photo} name={property.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{property.name}</span>
                  <span className="block truncate text-caption text-muted">
                    {plural(number(property.bookings), "booking", "bookings")} ·{" "}
                    {plural(number(property.roomTypes), "room type", "room types")}
                  </span>
                </span>
                <Money amount={property.revenue} currency={currency} className="shrink-0 text-sm font-semibold text-ink" />
              </>
            );
            const rowClass = "flex min-h-16 items-center gap-3 rounded-control px-2 py-2";
            return (
              <li key={property.id}>
                {canView ? (
                  <Link
                    to={`/stays/properties/${encodeURIComponent(property.id)}`}
                    className={cn(
                      rowClass,
                      "transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={rowClass}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ── Shortcuts ───────────────────────────────────────────────────────────── */

const SHORTCUTS = [
  { to: "/stays/availability", icon: <CalendarDays size={18} />, title: "Availability", copy: "Rooms and nightly rates" },
  { to: "/stays/finance", icon: <Wallet size={18} />, title: "Finance", copy: "Earnings and payouts" },
  { to: "/stays/analytics", icon: <ChartBar size={18} />, title: "Analytics", copy: "Bookings and revenue trends" },
];

function Shortcuts({ canOpen }: { canOpen: CanOpen }) {
  const links = SHORTCUTS.filter((link) => canOpen(link.to));
  if (!links.length) return null;
  return (
    <Card padding="none" as="nav" aria-labelledby="dashboard-shortcuts" className="p-5">
      <CardHeader className="mb-2" title={<span id="dashboard-shortcuts">Shortcuts</span>} />
      <ul className="-mx-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group flex min-h-14 items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES.brand.chip)}>
                {link.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{link.title}</span>
                <span className="block truncate text-caption text-muted">{link.copy}</span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── Loading ─────────────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="space-y-4 sm:space-y-6">
      <div className={cn("grid grid-cols-1 gap-4 sm:gap-6", SIDE_COLUMN)}>
        <Skeleton height={300} className="rounded-card xl:col-start-2 xl:row-start-1" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:col-start-1 xl:row-start-1 xl:grid-cols-2 xl:gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={136} className="rounded-card" />
          ))}
        </div>
      </div>
      <Skeleton height={360} className="rounded-card" />
    </div>
  );
}
