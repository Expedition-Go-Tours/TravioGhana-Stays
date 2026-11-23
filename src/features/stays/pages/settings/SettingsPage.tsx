import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { describeRoles } from "@/config/teamRoles";
import { useTeamRole } from "@/hooks/useTeamRole";
import { canOpenSettingsTab } from "@/config/pageAccess";
import StaysPageHeader from "@/features/stays/components/StaysPageHeader";
import { TABS } from "./constants";
import { useTabParam } from "./useTabParam";
import ProfileTab from "./ProfileTab";
import NotificationsTab from "./NotificationsTab";
import PayoutsTab from "./PayoutsTab";
import SecurityTab from "./SecurityTab";
import TaxTab from "./TaxTab";
import TeamTab from "./TeamTab";

const PANELS = {
  profile: ProfileTab,
  notifications: NotificationsTab,
  payouts: PayoutsTab,
  security: SecurityTab,
  tax: TaxTab,
  team: TeamTab,
} as const;

export default function StaysSettingsPage() {
  const [requestedTab, setTab] = useTabParam("profile");
  const { hasPermission, isOwner, teamRoles } = useTeamRole();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // One rule per tab, shared with the search palette: a tab is only offered to
  // a role whose API calls on it will actually succeed.
  const filteredTabs = TABS.filter((tab) => canOpenSettingsTab(hasPermission, tab.key));

  // Guard against a stale, removed or forbidden tab in the URL — including a
  // tab this role cannot open. A member with no business rights lands on the
  // first tab they do have (Security for support, and so on).
  const activeTab = filteredTabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : (filteredTabs[0]?.key ?? "security");

  // Rewrite a forbidden/stale `?tab=` so a shared link cannot keep pointing at
  // a panel the viewer will never see.
  useEffect(() => {
    if (requestedTab !== activeTab) setTab(activeTab);
  }, [requestedTab, activeTab, setTab]);

  const Panel = PANELS[activeTab as keyof typeof PANELS] ?? SecurityTab;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = filteredTabs.findIndex((tab) => tab.key === activeTab);
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % filteredTabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + filteredTabs.length) % filteredTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = filteredTabs.length - 1;
    else return;

    event.preventDefault();
    const key = filteredTabs[next]?.key;
    if (!key) return;
    setTab(key);
    tabRefs.current[key]?.focus();
  };

  return (
    <div className="max-w-6xl">
      <StaysPageHeader
        title="Settings"
        subtitle="Manage your account and business settings"
        actions={
          !isOwner && teamRoles.length > 0 ? (
            <span className="rounded-full bg-surface-strong px-3 py-1 text-caption font-semibold text-body">
              {describeRoles(teamRoles)} access
            </span>
          ) : undefined
        }
      />

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Section list: horizontal scroller on phones, vertical index on desktop. */}
        <nav
          role="tablist"
          aria-label="Settings sections"
          aria-orientation="horizontal"
          className="scrollbar-none -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-20 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                ref={(node) => { tabRefs.current[tab.key] = node; }}
                type="button"
                role="tab"
                id={`settings-tab-${tab.key}`}
                aria-selected={active}
                aria-controls={`settings-panel-${tab.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(tab.key)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  "lg:w-full lg:justify-start lg:rounded-xl lg:px-3",
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-body hover:bg-surface-soft hover:text-ink",
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          role="tabpanel"
          id={`settings-panel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
          tabIndex={0}
          className="min-w-0 pb-24 focus-visible:outline-none lg:pb-0"
        >
          <Panel />
        </div>
      </div>
    </div>
  );
}
