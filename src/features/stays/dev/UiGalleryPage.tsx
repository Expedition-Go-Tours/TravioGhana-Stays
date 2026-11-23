import { useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Checkbox,
  Field,
  IconButton,
  Input,
  Money,
  NativeSelect,
  ScoreBadge,
  StatCard,
  StatusBadge,
  Switch,
  Textarea,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  EmptyState,
  ErrorState,
  Pagination,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  UnavailableState,
  type DataColumn,
} from "@/components/ui";
import { StaysSelect } from "../components/StaysForm";
import StaysPageHeader from "../components/StaysPageHeader";
import { CalendarDays, Plus, Search, Trash2, TrendingUp, X } from "@/features/stays/icons";
import { STATUS_TONES, type StatusDomain, type Tone } from "@/lib/statusTones";
import { useThemeStore } from "@/stores/themeStore";

/**
 * Dev-only component gallery — `/stays/dev/ui`. Every primitive and variant in
 * one place, in the current theme. Not in production builds.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-overline font-bold uppercase text-muted">{title}</h2>
      {children}
    </section>
  );
}

const TONES: Tone[] = ["brand", "success", "warning", "danger", "info", "neutral", "accent"];

type SampleRow = { id: string; guest: string; stay: string; nights: number; amount: number; status: string };
const TABLE_ROWS: SampleRow[] = [
  { id: "TG-S-20493", guest: "Sarah Johnson", stay: "4–8 Oct", nights: 4, amount: 3000, status: "Confirmed" },
  { id: "TG-S-20494", guest: "Kwame Agyeman", stay: "10–12 Oct", nights: 2, amount: 1700, status: "New" },
  { id: "TG-S-20496", guest: "Emily Carter", stay: "2–5 Nov", nights: 3, amount: 1400, status: "Cancelled" },
];
const TABLE_COLUMNS: DataColumn<SampleRow>[] = [
  {
    key: "guest",
    header: "Guest",
    sortable: true,
    cell: (row) => (
      <span className="flex items-center gap-3">
        <Avatar name={row.guest} size="sm" />
        <span>
          <span className="block font-semibold text-ink">{row.guest}</span>
          <span className="block text-caption text-muted">{row.id}</span>
        </span>
      </span>
    ),
    sortValue: (row) => row.guest,
  },
  { key: "stay", header: "Stay", cell: (row) => `${row.stay} · ${row.nights} nights` },
  { key: "status", header: "Status", cell: (row) => <StatusBadge domain="booking" status={row.status} /> },
  { key: "amount", header: "Total", align: "right", sortable: true, cell: (row) => <Money amount={row.amount} className="font-semibold text-ink" /> },
];

export default function UiGalleryPage() {
  const theme = useThemeStore((s) => s.resolved);
  const setMode = useThemeStore((s) => s.setMode);
  const [instant, setInstant] = useState(true);
  const [selectValue, setSelectValue] = useState("Hotel");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  return (
    <div className="max-w-5xl space-y-10">
      <StaysPageHeader
        title="Component gallery (dev only)"
        subtitle="Every shared primitive in the current theme."
        actions={
          <Button onClick={() => setMode(theme === "dark" ? "light" : "dark")}>
            Switch to {theme === "dark" ? "light" : "dark"}
          </Button>
        }
      />

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">
            <Plus size={16} /> List a property
          </Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">
            <Trash2 size={16} /> Delete
          </Button>
          <Button variant="dangerSoft">Remove</Button>
          <Button variant="link">View all</Button>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg" variant="primary">
            Large
          </Button>
          <IconButton aria-label="Search">
            <Search size={18} />
          </IconButton>
          <IconButton aria-label="Close" variant="secondary" size="iconSm">
            <X size={16} />
          </IconButton>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} dot>
              {tone}
            </Badge>
          ))}
        </div>
        {(Object.keys(STATUS_TONES) as StatusDomain[]).map((domain) => (
          <div key={domain} className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-caption text-muted">{domain}</span>
            {Object.keys(STATUS_TONES[domain]).map((status) => (
              <StatusBadge key={status} domain={domain} status={status} />
            ))}
          </div>
        ))}
      </Section>

      <Section title="Stat cards and money">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Arrivals" value="12" hint="Next 7 days" icon={<CalendarDays size={18} />} change={8} changeLabel="vs last week" />
          <StatCard label="Gross booking value" value={<Money amount={12400} compact />} icon={<TrendingUp size={18} />} change={-3.2} />
          <StatCard label="Live properties" value="3" tone="success" />
          <StatCard label="Promotions" value="2" tone="accent" hint="1 ends this week" />
        </div>
        <p className="flex flex-wrap gap-4 text-sm text-body">
          <Money amount={1250} />
          <Money amount={1_250_000} compact />
        </p>
      </Section>

      <Section title="Review score">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreBadge score={9.4} reviewCount={128} />
          <ScoreBadge stars={4.3} reviewCount={12} />
          <ScoreBadge score={7.2} size="lg" />
          <ScoreBadge score={6.1} size="sm" compact />
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar name="Ama Boateng" size="sm" />
          <Avatar name="Kwame Agyeman" />
          <Avatar name="Sarah Johnson" size="lg" />
          <Avatar name="Akwaaba Coast Hotel" size="xl" />
        </div>
      </Section>

      <Section title="Dialogs, sheets and tooltips">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Edit rate plan"
              description="Changes apply to new bookings only."
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button variant="primary">Save plan</Button>
                </>
              }
            >
              <Field label="Plan name">
                <Input defaultValue="Standard rate" />
              </Field>
            </DialogContent>
          </Dialog>
          <Button variant="dangerSoft" onClick={() => setConfirmOpen(true)}>
            Open confirm
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Cancel this booking?"
            description="Sarah Johnson is refunded in full. This can't be undone."
            confirmLabel="Cancel booking"
            cancelLabel="Keep booking"
            onConfirm={() => setConfirmOpen(false)}
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button>Open sheet</Button>
            </SheetTrigger>
            <SheetContent
              title="Booking TG-S-20493"
              description="Sarah Johnson · 4 nights"
              footer={
                <>
                  <SheetClose asChild>
                    <Button variant="ghost">Close</Button>
                  </SheetClose>
                  <Button variant="primary">Confirm booking</Button>
                </>
              }
            >
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Check-in</dt><dd>Sun 4 Oct</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Check-out</dt><dd>Thu 8 Oct</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Total</dt><dd><Money amount={3000} /></dd></div>
              </dl>
            </SheetContent>
          </Sheet>
          <Tooltip content="Arrivals in the next 7 days">
            <Button variant="ghost">Hover or focus me</Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="earnings">
          <TabsList aria-label="Finance sections">
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="payouts" count={3}>Payouts</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="claims">Refund requests</TabsTrigger>
            <TabsTrigger value="methods">Payout methods</TabsTrigger>
          </TabsList>
          <TabsContent value="earnings" className="pt-4 text-sm text-body">Earnings panel</TabsContent>
          <TabsContent value="payouts" className="pt-4 text-sm text-body">Payouts panel</TabsContent>
          <TabsContent value="refunds" className="pt-4 text-sm text-body">Refunds panel</TabsContent>
          <TabsContent value="claims" className="pt-4 text-sm text-body">Claims panel</TabsContent>
          <TabsContent value="methods" className="pt-4 text-sm text-body">Methods panel</TabsContent>
        </Tabs>
        <Tabs defaultValue="all" className="mt-4">
          <TabsList variant="pill" aria-label="Review filter">
            <TabsTrigger variant="pill" value="all">All</TabsTrigger>
            <TabsTrigger variant="pill" value="unreplied" count={2}>Unreplied</TabsTrigger>
            <TabsTrigger variant="pill" value="replied">Replied</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Data table (cards on phones)">
        <Card padding="none" className="p-2 sm:p-3">
          <DataTable
            ariaLabel="Sample reservations"
            columns={TABLE_COLUMNS}
            rows={TABLE_ROWS}
            onRowClick={() => {}}
            rowLabel={(row) => `Open booking ${row.id}`}
            footer={<Pagination page={tablePage} totalPages={3} totalCount={27} onPageChange={setTablePage} itemLabel="bookings" />}
          />
        </Card>
      </Section>

      <Section title="States">
        <div className="grid gap-4 md:grid-cols-3">
          <Card padding="none">
            <EmptyState compact title="No bookings yet" description="New reservations appear here." action={<Button size="sm">Share listing</Button>} />
          </Card>
          <Card padding="none">
            <ErrorState compact onRetry={() => {}} />
          </Card>
          <Card padding="none">
            <UnavailableState compact feature="Analytics" />
          </Card>
        </div>
      </Section>

      <Section title="Cards and forms">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Property details" description="Shown on your listing" actions={<Button size="sm">Edit</Button>} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property name" required hint="As guests will see it">
                <Input placeholder="Akwaaba Coast Hotel" />
              </Field>
              <Field label="Nightly price">
                <Input leading="$" placeholder="0.00" inputMode="decimal" />
              </Field>
              <Field label="Email" error="Enter a valid email address">
                <Input type="email" defaultValue="front desk@" />
              </Field>
              <Field label="Property type">
                <StaysSelect options={["Hotel", "Guesthouse", "Apartment"]} value={selectValue} onChange={(e) => setSelectValue(e.target.value)} />
              </Field>
              <Field label="Currency" hint="The native picker, best on phones">
                <NativeSelect defaultValue="USD">
                  <option>USD</option>
                  <option>USD</option>
                  <option>EUR</option>
                </NativeSelect>
              </Field>
              <Field label="Disabled">
                <Input disabled value="Read only" readOnly />
              </Field>
              <Field label="About the property" wide>
                <Textarea placeholder="What makes it special?" />
              </Field>
            </div>
            <CardFooter>
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary">Save changes</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader title="Booking settings" />
            <div className="divide-y divide-hairline">
              <Switch label="Instant booking" description="Guests book without waiting for you" checked={instant} onCheckedChange={setInstant} />
              <Switch label="Accept long stays" description="30 nights or more" />
              <Switch label="Pets allowed" disabled />
            </div>
            <div className="mt-4">
              <Checkbox label="Breakfast included" description="Shown on the listing" defaultChecked />
              <Checkbox label="Free parking" />
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
