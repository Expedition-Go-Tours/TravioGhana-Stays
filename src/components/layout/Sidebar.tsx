import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate, type Location } from "react-router-dom";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { mockSessionEnabled } from "@/lib/mockSession";
import { loadSupplierProfile } from "@/features/auth/api";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { BadgeCheck, ChevronDown, ChevronLeft, Home, LogOut } from "@/features/stays/icons";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { describeRoles } from "@/config/teamRoles";
import { STAYS_NAV_GROUPS } from "@/config/staysNav";
import { LIVE_SITES } from "@/lib/platforms";
import { Avatar, ConfirmDialog, Sheet, SheetContent, Tooltip } from "@/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MOBILE_NAV_ID } from "./shell";

/* ── Business identity ─────────────────────────────────────────────────────
 * The card describes the BUSINESS, whoever is signed in. A team member's own
 * account is a plain `customer` account; `/suppliers/application/status` is
 * resolved through the membership, so a member receives the owner's name,
 * logo, verification status and join date. */

type BusinessInfo = { businessName?: string; displayName?: string; legalBusinessName?: string } | string | null | undefined;
type BusinessProfile = {
  businessName?: string;
  businessInfo?: BusinessInfo;
  logoUrl?: string | null;
  status?: string | null;
  supplierProfile?: { status?: string };
  supplierSince?: string;
  createdAt?: string;
};

function extractBusinessName(info: BusinessInfo): string | null {
  if (!info) return null;
  if (typeof info === "string") {
    try {
      const parsed = JSON.parse(info);
      return parsed.businessName || parsed.displayName || parsed.legalBusinessName || null;
    } catch {
      return null;
    }
  }
  return info.businessName || info.displayName || info.legalBusinessName || null;
}

const STATUS_LABELS: Record<string, { label: string; tone: "success" | "warning" | "info" | "danger" }> = {
  PENDING: { label: "Pending", tone: "warning" },
  UNDER_REVIEW: { label: "Under Review", tone: "info" },
  APPROVED: { label: "Approved", tone: "info" },
  ACTIVE: { label: "Verified", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

const TONE_TEXT = { success: "text-success", warning: "text-warning", info: "text-info", danger: "text-danger" } as const;
const TONE_DOT = { success: "bg-success", warning: "bg-warning", info: "bg-info", danger: "bg-danger" } as const;

type Identity = {
  name: string;
  logoUrl: string | null;
  status: (typeof STATUS_LABELS)[string] | null;
  roleLine: string | null;
  memberSince: string | null;
  settingsPath: string;
};

function useBusinessIdentity(): Identity {
  const user = useAuthStore((state) => state.user);
  const supplierProfile = useAuthStore((state) => state.supplierProfile) as BusinessProfile | null;
  const { hasPermission, isOwner, teamRoles } = useTeamRole();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [fetchedLogo, setFetchedLogo] = useState<{ url: string | null } | null>(null);

  const actsForSupplier = Boolean(user?.roles?.includes("supplier")) || Boolean(supplierProfile) || teamRoles.length > 0;

  useEffect(() => {
    // Mock mode has no backend: the seeded session is the business.
    if (mockSessionEnabled || !actsForSupplier) return;
    let cancelled = false;
    loadSupplierProfile()
      .then((profile: BusinessProfile | null) => {
        if (!cancelled) setBusiness(profile || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [actsForSupplier]);

  // The logo is read from the server on mount (the stored user can be stale).
  const isSupplierAccount = Boolean(user?.roles?.includes("supplier"));
  useEffect(() => {
    if (mockSessionEnabled || !isSupplierAccount) return;
    let cancelled = false;
    api
      .get("/users/me", { skipGlobalErrorHandler: true })
      .then((res) => {
        const fresh = res.data?.data?.user;
        if (cancelled || !fresh) return;
        setFetchedLogo({ url: fresh.logoUrl || null });
        useAuthStore.getState().updateUser({ logoUrl: fresh.logoUrl || null, createdAt: fresh.createdAt });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSupplierAccount]);

  const businessName =
    business?.businessName ||
    extractBusinessName(business?.businessInfo) ||
    extractBusinessName(supplierProfile?.businessInfo) ||
    supplierProfile?.businessName ||
    null;
  const statusKey = business?.status || business?.supplierProfile?.status || supplierProfile?.status || "";

  return {
    name: businessName || user?.name || "Supplier",
    logoUrl: business?.logoUrl || (fetchedLogo ? fetchedLogo.url : (user?.logoUrl as string | undefined) ?? null),
    status: STATUS_LABELS[statusKey] ?? null,
    // The badge describes the business; this line describes the person.
    roleLine: isOwner ? null : describeRoles(teamRoles) || "Team member",
    memberSince: business?.supplierSince || supplierProfile?.createdAt || (user?.createdAt as string | undefined) || null,
    // A member without business-profile rights still has their own Security tab.
    settingsPath: hasPermission("settings.business") ? "/stays/settings?tab=profile" : "/stays/settings",
  };
}

/* ── Pieces ────────────────────────────────────────────────────────────────
 * The desktop sidebar shrinks to an icon rail on tablets (CSS, md–lg) and when
 * collapsed on desktop (`data-rail`). Text in the rail stays available to
 * screen readers (sr-only); purely decorative extras are hidden outright. */

type Mode = "aside" | "drawer";

const railSrOnly = "md:max-lg:sr-only group-data-[rail=true]/sidebar:sr-only";
const railHidden = "md:max-lg:hidden group-data-[rail=true]/sidebar:hidden";
const railCenter =
  "md:max-lg:justify-center md:max-lg:px-0 group-data-[rail=true]/sidebar:justify-center group-data-[rail=true]/sidebar:px-0";

type NavEntry = {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number; weight?: string; className?: string }>;
  end?: boolean;
  match?: (location: Location) => boolean;
};

function isActive(item: NavEntry, location: Location) {
  if (item.match) return item.match(location);
  if (item.end) return location.pathname === item.path;
  return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
}

function NavItem({
  item,
  mode,
  showTooltip,
  onNavigate,
}: {
  item: NavEntry;
  mode: Mode;
  showTooltip: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = isActive(item, location);
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-control px-3 text-[0.9375rem] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-brand-soft font-semibold text-brand-ink" : "text-body hover:bg-surface-strong hover:text-ink",
        mode === "aside" && railCenter,
      )}
    >
      {active && (
        <span aria-hidden="true" className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
      )}
      <Icon size={20} weight={active ? "fill" : "regular"} className="shrink-0" />
      <span className={cn("truncate", mode === "aside" && railSrOnly)}>{item.label}</span>
    </NavLink>
  );

  return showTooltip ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function LiveSite({ mode }: { mode: Mode }) {
  const { storefronts } = useTeamRole();
  // One destination is a link, two are a menu. An empty answer (still loading,
  // or no brand roles) falls back to Travio Ghana so the control never vanishes.
  const sites = LIVE_SITES.filter((site) => (storefronts || []).includes(site.key));
  const links = sites.length ? sites : [LIVE_SITES[0]];
  const className = cn(
    "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-medium text-muted transition-colors",
    "hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    // On the tablet rail it shrinks to its icon (the label stays for screen readers).
    mode === "aside" && "md:max-lg:px-0 [&>span]:md:max-lg:sr-only [&>svg:last-child]:md:max-lg:hidden",
  );

  if (links.length > 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={className} aria-label="Live Site">
            <Home size={18} />
            <span>Live Site</span>
            <ChevronDown size={12} className="opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-60">
          {links.map((site) => (
            <DropdownMenuItem
              key={site.key}
              onSelect={() => window.open(site.url, "_blank", "noopener,noreferrer")}
              className="gap-2.5"
            >
              <img src={site.favicon} alt="" width={16} height={16} className="shrink-0 rounded-[3px]" />
              <span className="text-sm">{site.name}</span>
              <span className="ml-auto text-caption text-muted">{site.domain}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <a href={links[0].url} target="_blank" rel="noopener noreferrer" className={className} aria-label="Live Site">
      <Home size={18} />
      <span>Live Site</span>
    </a>
  );
}

function BusinessCard({ identity, mode, onNavigate }: { identity: Identity; mode: Mode; onNavigate?: () => void }) {
  const aside = mode === "aside";
  return (
    <Link
      to={identity.settingsPath}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-card border border-hairline bg-surface-soft p-3 transition-colors",
        "hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        aside &&
          "md:max-lg:justify-center md:max-lg:border-transparent md:max-lg:bg-transparent md:max-lg:p-1.5 group-data-[rail=true]/sidebar:justify-center group-data-[rail=true]/sidebar:border-transparent group-data-[rail=true]/sidebar:bg-transparent group-data-[rail=true]/sidebar:p-1.5",
      )}
    >
      <Avatar src={identity.logoUrl} name={identity.name} size="md" />
      <span className={cn("min-w-0 flex-1", aside && railSrOnly)}>
        <span className="block truncate text-sm font-bold text-ink" title={identity.name}>
          {identity.name}
        </span>
        {identity.status ? (
          <span className={cn("mt-0.5 flex items-center gap-1 text-caption font-semibold", TONE_TEXT[identity.status.tone])}>
            {identity.status.label === "Verified" ? (
              <BadgeCheck size={13} className="shrink-0" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[identity.status.tone])} />
            )}
            {identity.status.label}
          </span>
        ) : (
          !identity.roleLine && <span className="mt-0.5 block text-caption text-muted">Administrator</span>
        )}
        {identity.roleLine && (
          <span className="mt-0.5 block truncate text-caption text-muted" title="Your team role">
            {identity.roleLine}
          </span>
        )}
        {identity.memberSince && (
          <span className="mt-0.5 block text-caption text-muted">
            Member since {new Date(identity.memberSince).getFullYear()}
          </span>
        )}
      </span>
    </Link>
  );
}

function SidebarBody({
  identity,
  mode,
  showTooltips,
  onNavigate,
  onSignOut,
  header,
}: {
  identity: Identity;
  mode: Mode;
  showTooltips: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  header?: ReactNode;
}) {
  const { hasPermission } = useTeamRole();
  const groups = STAYS_NAV_GROUPS.map((group) => ({
    ...group,
    items: (group.items as (NavEntry & { permission?: string | null })[]).filter(
      (item) => !item.permission || hasPermission(item.permission),
    ),
  })).filter((group) => group.items.length > 0);
  const aside = mode === "aside";

  return (
    <>
      {header}
      <div className={cn("shrink-0 px-3 pb-2 pt-3", aside && "md:max-lg:px-2 group-data-[rail=true]/sidebar:px-2")}>
        <BusinessCard identity={identity} mode={mode} onNavigate={onNavigate} />
      </div>

      <nav aria-label="Main navigation" className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && "mt-4")}>
            <p className={cn("px-3 pb-1.5 text-overline font-bold uppercase text-muted", aside && railHidden)}>
              {group.label.charAt(0) + group.label.slice(1).toLowerCase()}
            </p>
            {index > 0 && aside && (
              <span
                aria-hidden="true"
                className="mx-2 mb-2 hidden h-px bg-hairline md:max-lg:block group-data-[rail=true]/sidebar:block"
              />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavItem item={item} mode={mode} showTooltip={showTooltips} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-hairline p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SignOutButton mode={mode} showTooltip={showTooltips} onClick={onSignOut} />
      </div>
    </>
  );
}

function SignOutButton({ mode, showTooltip, onClick }: { mode: Mode; showTooltip: boolean; onClick: () => void }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-control px-3 text-[0.9375rem] font-medium text-muted transition-colors",
        "hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        mode === "aside" && railCenter,
      )}
    >
      <LogOut size={20} className="shrink-0" />
      <span className={cn(mode === "aside" && railSrOnly)}>Sign out</span>
    </button>
  );
  return showTooltip ? (
    <Tooltip content="Sign out" side="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

export default function Sidebar() {
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const identity = useBusinessIdentity();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const atLeastMd = useBreakpoint("md");
  const atLeastLg = useBreakpoint("lg");
  // Tooltips only where the labels are hidden: the tablet rail and the collapsed desktop rail.
  const railShowsTooltips = atLeastMd && (!atLeastLg || isCollapsed);

  // The drawer closes on any navigation (links, the profile card, programmatic
  // redirects) and when the window grows past the phone layout.
  useEffect(() => {
    closeMobile();
  }, [location.pathname, location.search, closeMobile]);
  useEffect(() => {
    if (atLeastMd) closeMobile();
  }, [atLeastMd, closeMobile]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await useAuthStore.getState().logout();
    } finally {
      setSigningOut(false);
      setConfirmSignOut(false);
    }
    navigate("/login", { replace: true });
  };

  const askSignOut = () => {
    closeMobile();
    setConfirmSignOut(true);
  };

  return (
    <>
      <aside
        id="app-sidebar"
        aria-label="Workspace"
        data-rail={isCollapsed ? "true" : "false"}
        className={cn(
          "group/sidebar fixed bottom-0 left-0 top-[var(--preview-banner-height)] z-30 hidden w-[var(--nav-w)] flex-col",
          "border-r border-hairline bg-surface transition-[width] duration-200 md:flex",
        )}
      >
        <SidebarBody
          identity={identity}
          mode="aside"
          showTooltips={railShowsTooltips}
          onSignOut={askSignOut}
          header={
            <div className={cn("flex h-16 shrink-0 items-center justify-between gap-2 border-b border-hairline px-3", railCenter)}>
              {/* The collapsed rail has no room for it; the tablet rail hides it with CSS. */}
              {!isCollapsed && <LiveSite mode="aside" />}
              <button
                type="button"
                onClick={toggle}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isCollapsed}
                aria-controls="app-sidebar"
                className={cn(
                  "hidden h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors lg:inline-flex",
                  "hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <ChevronLeft size={18} className={cn("transition-transform duration-200", isCollapsed && "rotate-180")} />
              </button>
            </div>
          }
        />
      </aside>

      {/* Phones: the same navigation in a drawer (focus trap, Escape, scroll lock). */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => (open ? undefined : closeMobile())}>
        <SheetContent
          id={MOBILE_NAV_ID}
          side="left"
          title="Menu"
          className="w-[min(88vw,20rem)] p-0"
          bodyClassName="flex flex-col p-0"
          // Opened from the header's menu button (not a Radix trigger), so hand focus back to it.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.querySelector<HTMLElement>(`[aria-controls="${MOBILE_NAV_ID}"]`)?.focus();
          }}
        >
          <div className="px-3 pt-2">
            <LiveSite mode="drawer" />
          </div>
          <SidebarBody identity={identity} mode="drawer" showTooltips={false} onNavigate={closeMobile} onSignOut={askSignOut} />
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out of the dashboard?"
        description="You'll need to sign in again to manage your stays."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        loading={signingOut}
        onConfirm={signOut}
      />
    </>
  );
}
