/**
 * Shell geometry — one source of truth for the header, the sidebar and the
 * page container.
 *
 * Navigation by screen size:
 *   phones  (< md, 768px)  no sidebar; the menu button opens a drawer
 *   tablets (md – lg)      a 72px icon rail
 *   desktop (≥ lg, 1024px) a 272px sidebar the user can collapse to the rail
 *
 * AppShell sets `--nav-w` to the current sidebar width; the header and main
 * area offset themselves by it, so the three can never disagree.
 *
 * Rules for pages (checked by __tests__/pageAlignment.test.tsx):
 *   - never declare your own horizontal page gutter — PageContainer owns it;
 *   - a narrower reading measure is fine, as long as it is left-aligned.
 * Full-bleed routes (`handle.bleed`) own their layout and import SHELL_GUTTER.
 */
export const HEADER_HEIGHT = 64;
export const RAIL_WIDTH = 72;
export const SIDEBAR_WIDTH = 272;

/** CSS variable classes that size `--nav-w` per breakpoint and collapse state. */
export const NAV_WIDTH_CLASSES = {
  expanded: "[--nav-w:0px] md:[--nav-w:72px] lg:[--nav-w:272px]",
  collapsed: "[--nav-w:0px] md:[--nav-w:72px]",
} as const;

/** Horizontal page gutter, shared by the header and every page. */
export const SHELL_GUTTER = "px-4 lg:px-6";

/** One content measure for the whole dashboard. */
export const SHELL_MEASURE = "w-full max-w-[1440px]";

/** Vertical rhythm for a scrolling page. */
export const SHELL_PADDING_Y = "pt-5 pb-12 md:pt-7";

/** Keeps short pages from collapsing against the header (dynamic viewport units). */
export const SHELL_SURFACE = "min-h-[calc(100dvh-4rem)]";

/** The phone navigation drawer's id (the menu button's aria-controls). */
export const MOBILE_NAV_ID = "mobile-nav";

/** The header's 44px icon controls (menu, search, notifications). */
export const HEADER_ICON_BUTTON =
  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors " +
  "hover:bg-surface-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
