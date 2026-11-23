import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User, Mail, Loader2, Menu, Sun, Moon, Monitor } from "@/features/stays/icons";
import StaysNotificationBell from "@/features/stays/components/notifications/StaysNotificationBell";
import SearchDropdown from "@/components/layout/SearchDropdown";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore, type ThemeMode } from "@/stores/themeStore";
import { useTeamRole } from "@/hooks/useTeamRole";
import { describeRoles } from "@/config/teamRoles";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { HEADER_ICON_BUTTON, MOBILE_NAV_ID, SHELL_GUTTER } from "./shell";
import logoSrc from "@/assets/TravioGhana_Logo.svg";

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function Header() {
  const navigate = useNavigate();
  const isMobileOpen = useSidebarStore((state) => state.isMobileOpen);
  const openMobile = useSidebarStore((state) => state.openMobile);
  const user = useAuthStore((state) => state.user);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);

  const displayName = user?.name || "Your account";
  const avatarSrc = (user?.avatar || user?.photoURL || null) as string | null;
  // A team member's own account carries `roles: ["customer"]`; the role they
  // hold in the business comes through the membership. Say what they can do.
  const { isOwner, teamRoles } = useTeamRole();
  const displayRole = isOwner ? "Administrator" : describeRoles(teamRoles) || "Team member";

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    await useAuthStore.getState().logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={cn(
        "fixed right-0 top-[var(--preview-banner-height)] z-(--z-header) flex h-16 items-center gap-1 sm:gap-2",
        "left-0 border-b border-hairline bg-surface/90 backdrop-blur-md transition-[left] duration-200 md:left-[var(--nav-w)]",
        SHELL_GUTTER,
      )}
    >
      {/* Phones: opens the navigation drawer. Always mounted, so nothing shifts. */}
      <button
        type="button"
        onClick={openMobile}
        aria-label="Open menu"
        aria-expanded={isMobileOpen}
        aria-controls={MOBILE_NAV_ID}
        className={cn(HEADER_ICON_BUTTON, "-ml-2 md:hidden")}
      >
        <Menu size={22} />
      </button>

      <Link
        to="/stays"
        className="flex h-11 shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white dark:px-2"
      >
        <img src={logoSrc} alt="Travio Ghana — Stays dashboard home" className="h-auto w-[108px] sm:w-[140px] lg:w-[160px] dark:w-[96px] sm:dark:w-[124px]" />
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-end sm:justify-center sm:px-4">
        <div className="w-auto sm:w-full sm:max-w-md">
          <SearchDropdown />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <StaysNotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-11 min-w-11 items-center justify-center gap-2.5 rounded-control px-1 transition-colors sm:px-2",
                "hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {/* The name is built from the text itself, so what is read matches what is shown. */}
              <span className="sr-only">Account menu: </span>
              <span className="sr-only lg:hidden">{displayName}</span>
              <span className="hidden text-right lg:block">
                <span className="block max-w-40 truncate text-sm font-semibold text-ink">{displayName}</span>{" "}
                <span className="block text-caption text-muted">{displayRole}</span>
              </span>
              <Avatar src={avatarSrc} name={displayName} size="sm" decorative className="bg-brand text-on-brand" />
              <ChevronDown size={14} className="hidden text-muted sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0">
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-4">
              <Avatar src={avatarSrc} name={displayName} size="md" className="bg-brand text-on-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-caption text-muted">{displayRole}</p>
                {user?.email && (
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-caption text-muted">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="p-1.5">
              <DropdownMenuItem onSelect={() => navigate("/stays/settings")} className="min-h-11">
                <User size={16} className="text-muted" />
                Profile settings
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <div className="p-1.5">
              <DropdownMenuLabel className="px-3 pb-1 pt-1 text-overline font-semibold uppercase text-muted">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={themeMode} onValueChange={(value: string) => setThemeMode(value as ThemeMode)}>
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value} className="min-h-11 gap-2">
                    <Icon size={16} className="text-muted" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
            <DropdownMenuSeparator />
            <div className="p-1.5">
              <DropdownMenuItem
                onSelect={handleLogout}
                disabled={logoutLoading}
                className="min-h-11 text-danger focus:bg-danger-soft focus:text-danger"
              >
                {logoutLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                {logoutLoading ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
