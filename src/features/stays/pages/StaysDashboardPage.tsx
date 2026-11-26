import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ShieldWarning } from "@/features/stays/icons";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TAB_PANEL_TRANSITION,
  UnavailableState,
} from "@/components/ui";
import Skeleton from "@/components/shared/Skeleton";
import { canOpenPath } from "@/config/pageAccess";
import { useTabParam } from "@/hooks/useTabParam";
import { useTeamRole } from "@/hooks/useTeamRole";
import { queryStatus } from "@/lib/queryState";
import { useAuthStore } from "@/stores/authStore";
import type {
  DashboardHappeningToday,
  DashboardPerformanceComparison,
  DashboardPerformancePeriod,
  DashboardPropertyRow,
  DashboardSummary,
} from "@/types/stays";
import StaysPageHeader from "../components/StaysPageHeader";
import DashboardFeedback from "../components/dashboard/DashboardFeedback";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardViewControls from "../components/dashboard/DashboardViewControls";
import HappeningToday from "../components/dashboard/HappeningToday";
import OperationsToolbar from "../components/dashboard/OperationsToolbar";
import PerformanceSummary from "../components/dashboard/PerformanceSummary";
import PerformanceTable from "../components/dashboard/PerformanceTable";
import PerformanceToolbar from "../components/dashboard/PerformanceToolbar";
import PropertyOperationsTable from "../components/dashboard/PropertyOperationsTable";
import SettingsInsightCard from "../components/dashboard/SettingsInsightCard";
import SettingsTable from "../components/dashboard/SettingsTable";
import {
  DASHBOARD_COLUMNS,
  DASHBOARD_COLUMN_KEYS,
  DASHBOARD_TABS,
  dashboardCsv,
  dashboardCsvFilename,
  dashboardHasActiveFilters,
  dashboardLocationOptions,
  downloadCsv,
  filterDashboardProperties,
  filterDashboardRows,
  isPropertyStatusFilter,
  readDashboardView,
  writeDashboardView,
  type DashboardDensity,
  type DashboardFilters as Filters,
  type DashboardTab,
  type DashboardViewKey,
  type DashboardViewPrefs,
} from "../components/dashboard/dashboardModel";
import {
  PERFORMANCE_COLUMNS,
  PERFORMANCE_COLUMN_KEYS,
  fallbackPerformance,
  performanceCsv,
  performanceCsvFilename,
  summarizePerformanceRows,
} from "../components/dashboard/performanceModel";
import {
  SETTINGS_COLUMNS,
  SETTINGS_COLUMN_KEYS,
  fallbackSettings,
  settingsCsv,
  settingsCsvFilename,
} from "../components/dashboard/settingsModel";
import { fetchStaysDashboard, listProperties, STAYS_KEYS, staysUsesMockData } from "../api";
import { loadStaysVerification } from "../verification/api";
import { verificationActionCount, type VerificationPayload } from "../verification/actions";
import { resolvePropertyPhoto } from "../utils/propertyPhoto";

/**
 * The signed-in landing page: a Booking.com-style group homepage for the
 * supplier's properties. Operations, Performance and Settings share one
 * location/search filter; Performance is limited to roles that can open
 * Analytics.
 */

type CanOpen = (path: string) => boolean;

const ZERO_HAPPENING: DashboardHappeningToday = {
  reservations: 0,
  arrivals: 0,
  departures: 0,
  reviews: 0,
  cancellations: 0,
};

const TAB_PANEL_CLASS = `space-y-4 pt-4 ${TAB_PANEL_TRANSITION}`;

const number = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

/**
 * Normalise the Operations fields. They are optional in the contract, so an
 * older API falls back to the old summary rather than rendering empty tiles.
 */
function normalizeDashboard(data?: DashboardSummary): {
  happeningToday: DashboardHappeningToday;
  properties: DashboardPropertyRow[];
} {
  if (!data) return { happeningToday: ZERO_HAPPENING, properties: [] };

  const rawToday: Partial<DashboardHappeningToday> = data.happeningToday ?? {};
  const happeningToday: DashboardHappeningToday = {
    reservations: number(rawToday.reservations ?? data.stats?.newReservations),
    arrivals: number(rawToday.arrivals ?? data.stats?.upcomingArrivals),
    departures: number(rawToday.departures),
    reviews: number(rawToday.reviews),
    cancellations: number(rawToday.cancellations ?? data.cancellation?.cancelled),
  };

  const properties: DashboardPropertyRow[] = Array.isArray(data.properties)
    ? data.properties
    : (data.topProperties ?? []).map((property) => ({
        id: property.id,
        name: property.name,
        city: "",
        region: "",
        country: "",
        photo: property.photo ?? null,
        status: "Live",
        bookable: true,
        arrivalsNext48h: 0,
        departuresNext48h: 0,
        guestMessages: 0,
        supportMessages: 0,
      }));

  return { happeningToday, properties };
}

/** Fill a table row's missing photo from the property list's resolved covers. */
function attachCoverPhotos<T extends { id: string; photo?: string | null }>(
  rows: T[],
  covers: Map<string, string>,
): T[] {
  if (covers.size === 0) return rows;
  let changed = false;
  const next = rows.map((row) => {
    if (resolvePropertyPhoto(row)) return row;
    const photo = covers.get(row.id);
    if (!photo) return row;
    changed = true;
    return { ...row, photo };
  });
  return changed ? next : rows;
}

/** One persisted column/density preference per tab. */
function useDashboardView<K extends string>(
  view: DashboardViewKey,
  columns: readonly K[],
  defaultDensity: DashboardDensity = "comfortable",
) {
  const [prefs, setPrefs] = useState<DashboardViewPrefs<K>>(() =>
    readDashboardView(view, columns, defaultDensity),
  );

  const update = (next: DashboardViewPrefs<K>) => {
    setPrefs(next);
    writeDashboardView(view, next);
  };

  const toggleColumn = (key: K) => {
    const hiddenColumns = prefs.hiddenColumns.includes(key)
      ? prefs.hiddenColumns.filter((column) => column !== key)
      : [...prefs.hiddenColumns, key];
    update({ ...prefs, hiddenColumns });
  };

  const setDensity = (density: DashboardDensity) => update({ ...prefs, density });

  return { prefs, toggleColumn, setDensity };
}

export default function StaysDashboardPage() {
  const { hasPermission } = useTeamRole();
  const canOpen: CanOpen = (path) => canOpenPath(hasPermission, path);
  const user = useAuthStore((state) => state.user);
  const supplierProfile = useAuthStore((state) => state.supplierProfile);

  const canViewPerformance = canOpen("/stays/analytics");
  const allowedTabs: readonly DashboardTab[] = canViewPerformance
    ? DASHBOARD_TABS
    : (["operations", "settings"] as const);
  const [tab, setTab] = useTabParam<DashboardTab>("tab", allowedTabs, "operations");

  const [draftPeriod, setDraftPeriod] = useState<DashboardPerformancePeriod>("month-to-date");
  const [draftComparison, setDraftComparison] = useState<DashboardPerformanceComparison>("none");
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPerformancePeriod>("month-to-date");
  const [appliedComparison, setAppliedComparison] = useState<DashboardPerformanceComparison>("none");

  const dashboard = useQuery({
    queryKey: [...STAYS_KEYS.dashboard, appliedPeriod, appliedComparison],
    queryFn: () => fetchStaysDashboard({ period: appliedPeriod, compare: appliedComparison }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const canVerify = canOpen("/stays/verification");
  const verification = useQuery({
    queryKey: ["stays", "verification"],
    queryFn: () => loadStaysVerification() as Promise<VerificationPayload>,
    enabled: canVerify,
    staleTime: 60_000,
  });

  const [params, setParams] = useSearchParams();
  const operationsView = useDashboardView("operations", DASHBOARD_COLUMN_KEYS);
  const performanceView = useDashboardView("performance", PERFORMANCE_COLUMN_KEYS, "compact");
  const settingsView = useDashboardView("settings", SETTINGS_COLUMN_KEYS);

  const operatingData = useMemo(() => normalizeDashboard(dashboard.data), [dashboard.data]);
  const baseRows = operatingData.properties;
  // Newer dashboard payloads carry each row's cover. When one is missing, borrow
  // it from the properties list — the same cache entry the Properties page uses.
  const needsCoverPhotos = baseRows.some((row) => !resolvePropertyPhoto(row));
  const propertyCovers = useQuery({
    queryKey: STAYS_KEYS.properties(),
    queryFn: () => listProperties(),
    enabled: baseRows.length > 0 && needsCoverPhotos,
    staleTime: 60_000,
  });
  const coverById = useMemo(() => {
    const covers = new Map<string, string>();
    // Start with whatever the dashboard already sent, so a property's cover can
    // fill the other tabs even when no extra request is needed.
    for (const row of baseRows) {
      const photo = resolvePropertyPhoto(row);
      if (photo) covers.set(row.id, photo);
    }
    for (const property of propertyCovers.data ?? []) {
      if (covers.has(property.id)) continue;
      const photo = resolvePropertyPhoto(property);
      if (photo) covers.set(property.id, photo);
    }
    return covers;
  }, [baseRows, propertyCovers.data]);
  const rows = useMemo(() => attachCoverPhotos(baseRows, coverById), [baseRows, coverById]);
  const performanceData = useMemo(
    () =>
      dashboard.data?.performance ??
      fallbackPerformance(dashboard.data, rows, appliedPeriod, appliedComparison),
    [dashboard.data, rows, appliedPeriod, appliedComparison],
  );
  const settingsData = useMemo(
    () => dashboard.data?.settings ?? fallbackSettings(rows),
    [dashboard.data, rows],
  );
  const performanceRows = useMemo(
    () => attachCoverPhotos(performanceData.properties, coverById),
    [performanceData, coverById],
  );
  const settingsRows = useMemo(
    () => attachCoverPhotos(settingsData.properties, coverById),
    [settingsData, coverById],
  );
  const locations = useMemo(() => dashboardLocationOptions(rows), [rows]);

  const rawLocation = params.get("location") ?? "all";
  const location = locations.some((option) => option.value === rawLocation) ? rawLocation : "all";
  const rawStatus = params.get("status");
  const status = isPropertyStatusFilter(rawStatus) ? rawStatus : "All";
  const query = params.get("q") ?? "";
  const filters = useMemo<Filters>(() => ({ location, status, query }), [location, status, query]);
  const sharedFilters = useMemo(() => ({ location, query }), [location, query]);
  const filteredRows = useMemo(() => filterDashboardProperties(rows, filters), [rows, filters]);
  const filteredPerformanceRows = useMemo(
    () => filterDashboardRows(performanceRows, sharedFilters),
    [performanceRows, sharedFilters],
  );
  const filteredSettingsRows = useMemo(
    () => filterDashboardRows(settingsRows, sharedFilters),
    [settingsRows, sharedFilters],
  );
  const sharedFiltersActive = location !== "all" || query.trim().length > 0;
  const performanceSummary = useMemo(
    () => (sharedFiltersActive ? summarizePerformanceRows(filteredPerformanceRows) : performanceData.summary),
    [filteredPerformanceRows, performanceData, sharedFiltersActive],
  );
  const hasActiveFilters = dashboardHasActiveFilters(filters);

  const operationsVisibleColumns = useMemo(
    () =>
      DASHBOARD_COLUMNS.filter((column) => !operationsView.prefs.hiddenColumns.includes(column.key)).map(
        (column) => column.key,
      ),
    [operationsView.prefs.hiddenColumns],
  );
  const performanceVisibleColumns = useMemo(
    () =>
      PERFORMANCE_COLUMNS.filter((column) => !performanceView.prefs.hiddenColumns.includes(column.key)).map(
        (column) => column.key,
      ),
    [performanceView.prefs.hiddenColumns],
  );
  const settingsVisibleColumns = useMemo(
    () =>
      SETTINGS_COLUMNS.filter((column) => !settingsView.prefs.hiddenColumns.includes(column.key)).map(
        (column) => column.key,
      ),
    [settingsView.prefs.hiddenColumns],
  );

  const setFilterParam = (key: string, value: string, empty: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value || value === empty) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const resetFilters = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("location");
        next.delete("status");
        next.delete("q");
        return next;
      },
      { replace: true },
    );
  };

  const showData = () => {
    if (draftPeriod === appliedPeriod && draftComparison === appliedComparison) {
      void dashboard.refetch();
    } else {
      setAppliedPeriod(draftPeriod);
      setAppliedComparison(draftComparison);
    }
  };

  const downloadOperations = () => {
    if (!filteredRows.length) return;
    downloadCsv(dashboardCsvFilename(), dashboardCsv(filteredRows, operationsVisibleColumns));
    toast.success("Download started.");
  };

  const downloadPerformance = () => {
    if (!filteredPerformanceRows.length || !dashboard.data) return;
    downloadCsv(
      performanceCsvFilename(),
      performanceCsv(filteredPerformanceRows, performanceVisibleColumns, dashboard.data.currency),
    );
    toast.success("Download started.");
  };

  const downloadSettings = () => {
    if (!filteredSettingsRows.length) return;
    downloadCsv(settingsCsvFilename(), settingsCsv(filteredSettingsRows, settingsVisibleColumns));
    toast.success("Download started.");
  };

  const now = new Date();
  const businessName = supplierProfile?.businessName?.trim() || null;
  const statusState = queryStatus(dashboard);
  const verificationCount = canVerify ? verificationActionCount(verification.data) : 0;

  const header = (
    <StaysPageHeader
      title="Dashboard"
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {greetingFor(now, firstName(user?.name))} · {todayFormatter.format(now)}
          </span>
          {businessName && (
            <>
              <span aria-hidden="true" className="text-subtle max-sm:hidden">
                ·
              </span>
              <span className="min-w-0 truncate">{businessName}</span>
            </>
          )}
          {canVerify && verificationCount > 0 && (
            <Link
              to="/stays/verification"
              className="inline-flex items-center gap-1 rounded-sm text-caption font-semibold text-warning underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldWarning size={13} aria-hidden="true" />
              {verificationCount === 1
                ? "1 document to review"
                : `${verificationCount} documents to review`}
            </Link>
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
              Add new property
            </Link>
          </Button>
        )
      }
    />
  );

  if (statusState === "loading") {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (statusState === "unavailable") {
    return (
      <div>
        {header}
        <Card>
          <UnavailableState feature="Your operations homepage" />
        </Card>
      </div>
    );
  }

  if (statusState === "error" || !dashboard.data) {
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

  return (
    <div>
      {header}

      <DashboardFilters
        locations={locations}
        location={location}
        query={query}
        hasFilters={hasActiveFilters}
        onLocationChange={(value) => setFilterParam("location", value, "all")}
        onQueryChange={(value) => setFilterParam("q", value, "")}
        onReset={resetFilters}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)}>
        <TabsList aria-label="Dashboard sections">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          {canViewPerformance && <TabsTrigger value="performance">Performance</TabsTrigger>}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className={TAB_PANEL_CLASS}>
          <HappeningToday data={operatingData.happeningToday} canOpen={canOpen} />
          <OperationsToolbar
            status={status}
            onStatusChange={(value) => setFilterParam("status", value, "All")}
            hiddenColumns={operationsView.prefs.hiddenColumns}
            onToggleColumn={operationsView.toggleColumn}
            density={operationsView.prefs.density}
            onDensityChange={operationsView.setDensity}
            onDownload={downloadOperations}
            canDownload={filteredRows.length > 0}
          />
          <Card padding="none" className="overflow-hidden">
            <div className="px-1 pb-1">
              <PropertyOperationsTable
                rows={filteredRows}
                hiddenColumns={operationsView.prefs.hiddenColumns}
                density={operationsView.prefs.density}
                canOpenProperty={canOpen("/stays/properties")}
                canOpenChat={canOpen("/stays/customers")}
              />
            </div>
          </Card>
          <DashboardFeedback view="operations" />
        </TabsContent>

        {canViewPerformance && (
          <TabsContent value="performance" className={TAB_PANEL_CLASS}>
            <PerformanceSummary
              summary={performanceSummary}
              previous={sharedFiltersActive ? undefined : performanceData.previous}
              currency={dashboard.data.currency}
              periodLabel={performanceData.period.label}
              comparisonLabel={performanceData.comparison.label}
              opportunityHref={canOpen("/stays/special-offers") ? "/stays/special-offers" : "/stays/analytics"}
            />
            <p className="text-sm text-muted">
              Below you can find a breakdown of your properties&apos; performance.
            </p>
            <PerformanceToolbar
              period={draftPeriod}
              comparison={draftComparison}
              onPeriodChange={setDraftPeriod}
              onComparisonChange={setDraftComparison}
              onShowData={showData}
              loading={dashboard.isFetching}
              hiddenColumns={performanceView.prefs.hiddenColumns}
              onToggleColumn={performanceView.toggleColumn}
              density={performanceView.prefs.density}
              onDensityChange={performanceView.setDensity}
              onDownload={downloadPerformance}
              canDownload={filteredPerformanceRows.length > 0}
            />
            <Card padding="none" className="overflow-hidden">
              <div className="px-1 pb-1">
                <PerformanceTable
                  rows={filteredPerformanceRows}
                  hiddenColumns={performanceView.prefs.hiddenColumns}
                  density={performanceView.prefs.density}
                  currency={dashboard.data.currency}
                  canOpenProperty={canOpen("/stays/properties")}
                />
              </div>
            </Card>
            <DashboardFeedback view="performance" />
          </TabsContent>
        )}

        <TabsContent value="settings" className={TAB_PANEL_CLASS}>
          <SettingsInsightCard canOpenInsights={canViewPerformance} />
          <div className="flex flex-wrap items-center justify-end gap-1">
            <DashboardViewControls
              columns={SETTINGS_COLUMNS}
              hiddenColumns={settingsView.prefs.hiddenColumns}
              onToggleColumn={settingsView.toggleColumn}
              density={settingsView.prefs.density}
              onDensityChange={settingsView.setDensity}
              onDownload={downloadSettings}
              canDownload={filteredSettingsRows.length > 0}
            />
          </div>
          <Card padding="none" className="overflow-hidden">
            <div className="px-1 pb-1">
              <SettingsTable
                rows={filteredSettingsRows}
                hiddenColumns={settingsView.prefs.hiddenColumns}
                density={settingsView.prefs.density}
                canOpenProperty={canOpen("/stays/properties")}
              />
            </div>
          </Card>
          <DashboardFeedback view="settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Loading ─────────────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <Skeleton height={18} className="mb-2 w-24 rounded-md" />
          <Skeleton height={44} className="rounded-control" />
        </div>
        <div className="sm:w-80">
          <Skeleton height={18} className="mb-2 w-40 rounded-md" />
          <Skeleton height={44} className="rounded-control" />
        </div>
      </div>

      <div className="flex gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} height={44} className="w-24 rounded-control" />
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-hairline bg-surface p-5">
        <Skeleton height={24} className="w-40 rounded-md" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={96} className="rounded-control" />
          ))}
        </div>
      </div>

      <Skeleton height={340} className="rounded-card" />
    </div>
  );
}
