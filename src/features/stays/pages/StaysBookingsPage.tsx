import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  Input,
  Money,
  NativeSelect,
  Pagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Plus, RefreshCw, Search, SlidersHorizontal, Ticket, X } from "@/features/stays/icons";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { useTabParam } from "@/hooks/useTabParam";
import { getErrorMessage } from "@/lib/errorHandler";
import { queryStatus } from "@/lib/queryState";
import { cn } from "@/lib/utils";
import type { Booking, BookingListItem } from "@/types/stays";
import StaysPageHeader from "../components/StaysPageHeader";
import { BookingDetailSheet } from "../components/bookings/BookingDetailSheet";
import { BookingFiltersSheet } from "../components/bookings/BookingFiltersSheet";
import { ReservationCard } from "../components/bookings/BookingParts";
import { CreateBookingDialog } from "../components/bookings/CreateBookingDialog";
import {
  activeFilterCount,
  applyFilters,
  BOOKING_SORTS,
  BOOKING_TAB_VALUES,
  BOOKING_TABS,
  bookedValue,
  EMPTY_FILTERS,
  filtersFromParams,
  inTab,
  tabCounts,
  writeFilters,
  type BookingAction,
  type BookingFilters,
  type BookingSort,
} from "../components/bookings/bookingList";
import { reservationColumns } from "../components/bookings/reservationColumns";
import { listStaysBookings, STAYS_KEYS, updateBookingStatus } from "../api";
import { formatStayDate } from "../utils/stayDates";

/**
 * Bookings: every reservation, split into status tabs, with search, property
 * and check-in filters, and a sort. A row opens the booking in a side panel
 * (a bottom sheet on phones) where it can be confirmed, checked in, completed
 * or cancelled. The tab, filters and open booking live in the URL
 * (`?tab=new&q=sarah&bookingId=TG-S-20493`), so links from the dashboard and
 * notifications land on the right booking and the back button works.
 */

const PAGE_SIZE = 25;

export default function StaysBookingsPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTabParam] = useTabParam("tab", BOOKING_TAB_VALUES, "all");
  const paramsKey = params.toString();
  // Memoised on the query string so the object is stable between renders.
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(paramsKey)), [paramsKey]);
  const bookingId = params.get("bookingId");

  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersKey, setFiltersKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; status: string } | null>(null);
  const roomy = useBreakpoint("xl");

  const bookingsQuery = useQuery({
    queryKey: STAYS_KEYS.bookings(),
    queryFn: () => listStaysBookings(),
    staleTime: 20_000,
  });
  const status = queryStatus(bookingsQuery);
  const all = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);

  const counts = useMemo(() => tabCounts(all), [all]);
  const inCurrentTab = useMemo(() => all.filter((booking) => inTab(booking, tab)), [all, tab]);
  const rows = useMemo(() => applyFilters(inCurrentTab, filters), [inCurrentTab, filters]);
  const properties = useMemo(() => {
    const seen = new Map<string, string>();
    for (const booking of all) if (!seen.has(booking.propertyId)) seen.set(booking.propertyId, booking.propertyName);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = bookingId ? all.find((booking) => booking.id === bookingId) : undefined;
  const filterCount = activeFilterCount(filters);
  const filtered = filterCount > 0 || Boolean(filters.query.trim());

  /* ── URL state ─────────────────────────────────────────────────────────── */

  const setTab = (next: string) => {
    setTabParam(next as (typeof BOOKING_TAB_VALUES)[number]);
    setPage(1);
  };

  const setFilters = (next: BookingFilters) => {
    setParams((current) => writeFilters(current, next), { replace: true });
    setPage(1);
  };

  const openBooking = (id: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("bookingId", id);
      return next;
    });

  const closeBooking = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("bookingId");
        return next;
      },
      { replace: true },
    );

  /* ── Writes ────────────────────────────────────────────────────────────── */

  const refreshAfterWrite = () => {
    void queryClient.invalidateQueries({ queryKey: ["stays", "bookings"] });
    void queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
  };

  const statusMutation = useMutation({
    mutationFn: ({ booking, action }: { booking: BookingListItem; action: BookingAction }) =>
      updateBookingStatus(booking.id, action.to),
    onMutate: ({ booking, action }) => setPending({ id: booking.id, status: action.to }),
    onSuccess: (_saved, { booking, action }) => {
      // Show the new status straight away; the refetch then confirms it.
      queryClient.setQueryData<BookingListItem[]>(STAYS_KEYS.bookings(), (current) =>
        current?.map((row) => (row.id === booking.id ? { ...row, status: action.to } : row)),
      );
      refreshAfterWrite();
      toast.success(action.done);
    },
    onError: (error) => toast.error(getErrorMessage(error) || "We couldn't update the booking. Try again."),
    onSettled: () => setPending(null),
  });

  const handleCreated = (booking: Booking) => {
    setCreateOpen(false);
    toast.success(`Booking created for ${booking.guest}`);
    refreshAfterWrite();
    openBooking(booking.id);
  };

  /* ── Render ────────────────────────────────────────────────────────────── */

  const tabLabel = BOOKING_TABS.find((entry) => entry.value === tab)?.label ?? "All";
  const empty =
    all.length === 0 ? (
      <EmptyState
        icon={<Ticket size={22} />}
        title="No bookings yet"
        description="Reservations appear here as soon as guests book. You can also record a walk-in or phone booking yourself."
        action={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            Create booking
          </Button>
        }
      />
    ) : filtered ? (
      <EmptyState
        icon={<Search size={22} />}
        title="No bookings match"
        description="Try another search, or clear the filters to see every booking in this tab."
        action={<Button onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}>Clear filters</Button>}
      />
    ) : (
      <EmptyState icon={<Ticket size={22} />} title={`No ${tabLabel.toLowerCase()} bookings`} description="Bookings will show up here when their status matches." />
    );

  const chips: { key: keyof BookingFilters; label: string }[] = [
    filters.propertyId && {
      key: "propertyId" as const,
      label: properties.find((property) => property.id === filters.propertyId)?.name ?? "Property",
    },
    filters.from && { key: "from" as const, label: `Check-in from ${formatStayDate(filters.from)}` },
    filters.to && { key: "to" as const, label: `Check-in until ${formatStayDate(filters.to)}` },
  ].filter((chip): chip is { key: "propertyId" | "from" | "to"; label: string } => Boolean(chip));

  return (
    <div>
      <StaysPageHeader
        title="Bookings"
        subtitle="Every reservation across your properties."
        actions={
          <>
            <IconButton
              variant="secondary"
              aria-label="Refresh bookings"
              loading={bookingsQuery.isFetching && !bookingsQuery.isLoading}
              onClick={() => void bookingsQuery.refetch()}
            >
              {!(bookingsQuery.isFetching && !bookingsQuery.isLoading) && <RefreshCw size={18} />}
            </IconButton>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} weight="bold" aria-hidden="true" />
              Create booking
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Booking status">
          {BOOKING_TABS.map((entry) => (
            <TabsTrigger key={entry.value} value={entry.value} count={status === "success" ? counts[entry.value] : undefined}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="pt-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search bookings</span>
              <Input
                type="search"
                value={filters.query}
                placeholder="Guest, reference or property"
                leading={<Search size={18} aria-hidden="true" />}
                onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              />
            </label>
            <label className="hidden shrink-0 md:block">
              <span className="sr-only">Sort bookings</span>
              <NativeSelect
                value={filters.sort}
                className="w-56"
                onChange={(event) => setFilters({ ...filters, sort: event.target.value as BookingSort })}
              >
                {BOOKING_SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Button
              variant="secondary"
              aria-label={filterCount ? `Filters, ${filterCount} active` : "Filters"}
              className={cn(filterCount > 0 && "border-brand text-brand-ink")}
              onClick={() => {
                setFiltersKey((key) => key + 1);
                setFiltersOpen(true);
              }}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              <span className="max-sm:sr-only">Filters</span>
              {filterCount > 0 && (
                <span aria-hidden="true" className="figures min-w-5 rounded-full bg-brand px-1.5 text-caption font-bold text-on-brand">
                  {filterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Active filters */}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  aria-label={`Remove filter: ${chip.label}`}
                  onClick={() => setFilters({ ...filters, [chip.key]: "" })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hairline-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip.label}
                  <X size={14} aria-hidden="true" />
                </button>
              ))}
              <Button variant="link" size="sm" onClick={() => setFilters({ ...EMPTY_FILTERS, query: filters.query, sort: filters.sort })}>
                Clear all
              </Button>
            </div>
          )}

          {/* Result summary */}
          {status === "success" && rows.length > 0 && (
            <p className="mt-4 text-sm text-muted" aria-live="polite">
              <span className="figures font-semibold text-ink">{rows.length.toLocaleString("en-US")}</span>{" "}
              {rows.length === 1 ? "booking" : "bookings"}
              {bookedValue(rows) > 0 && (
                <>
                  {" · "}
                  <Money amount={bookedValue(rows)} currency={rows[0]?.currency} className="font-semibold text-ink" /> booked
                </>
              )}
            </p>
          )}

          <Card
            padding="none"
            className="mt-3 min-w-0 max-md:border-0 max-md:bg-transparent max-md:shadow-none"
          >
            <DataTable
              className="px-1 max-md:px-0"
              ariaLabel="Bookings"
              columns={reservationColumns({ roomy, withGuests: true })}
              rows={pageRows}
              status={status}
              onRetry={() => void bookingsQuery.refetch()}
              unavailableFeature="Bookings"
              loadingRows={5}
              empty={empty}
              onRowClick={(booking) => openBooking(booking.id)}
              rowLabel={(booking) => `Open booking ${booking.id} for ${booking.guest}`}
              renderCard={(booking) => <ReservationCard booking={booking} />}
              footer={
                <Pagination
                  className="px-4 max-md:px-0"
                  page={currentPage}
                  totalPages={totalPages}
                  totalCount={rows.length}
                  itemLabel="bookings"
                  onPageChange={setPage}
                />
              }
            />
          </Card>
        </TabsContent>
      </Tabs>

      <BookingFiltersSheet
        key={filtersKey}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={setFilters}
        bookings={inCurrentTab}
        properties={properties}
      />

      <BookingDetailSheet
        bookingId={bookingId}
        booking={selected}
        loading={bookingsQuery.isLoading || (Boolean(bookingId) && !selected && bookingsQuery.isFetching)}
        onClose={closeBooking}
        onAction={(booking, action) => statusMutation.mutateAsync({ booking, action })}
        pendingStatus={pending && pending.id === selected?.id ? pending.status : null}
      />

      <CreateBookingDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </div>
  );
}
