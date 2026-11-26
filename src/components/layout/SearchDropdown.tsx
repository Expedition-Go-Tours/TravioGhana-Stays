import { useCallback, useEffect, useId, useMemo, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Clock, CornerDownLeft, Search, X } from "@/features/stays/icons";
import { useTeamRole } from "@/hooks/useTeamRole";
import { canOpenSettingsTab } from "@/config/pageAccess";
import { STAYS_NAV_ITEMS } from "@/config/staysNav";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "@/components/ui";
import { HEADER_ICON_BUTTON } from "./shell";

/**
 * The command palette — jump to any page you can open. ⌘K / Ctrl+K anywhere.
 *
 * A Radix dialog (focus trap, Escape, scroll lock, focus return) holding a
 * combobox: the input owns focus while ↑/↓ move the active option, announced
 * through aria-activedescendant. The list is the same permission-filtered
 * navigation the sidebar shows, so search never offers a page that would 403.
 */
type IconComponent = ComponentType<{ size?: number; className?: string }>;
type NavChild = { label: string; tab?: string; section?: string; keywords?: readonly string[]; badge?: string };
type NavItem = {
  label: string;
  path: string;
  icon?: IconComponent;
  permission?: string | null;
  keywords?: string[];
  children?: NavChild[];
};
type FlatItem = { label: string; path: string; parent?: string; icon?: IconComponent; keywords: string[] };

function flatten(items: NavItem[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const item of items) {
    out.push({ label: item.label, path: item.path, icon: item.icon, keywords: item.keywords || [] });
    for (const child of item.children || []) {
      const href = child.tab
        ? `${item.path}?tab=${encodeURIComponent(child.tab)}`
        : child.section
          ? `${item.path}?section=${encodeURIComponent(child.section)}`
          : item.path;
      out.push({
        label: child.label,
        parent: item.label,
        path: href,
        icon: item.icon,
        keywords: [...(item.keywords || []), ...(child.keywords || [])],
      });
    }
  }
  return out;
}

const searchableText = (item: FlatItem) => [item.label, item.parent || "", ...item.keywords].join(" ").toLowerCase();

const RECENT_KEY = "stays-search-recent";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeRecent(paths: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(paths.slice(0, MAX_RECENT)));
  } catch {
    /* storage unavailable */
  }
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-brand-soft px-0.5 text-brand-ink">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export default function SearchDropdown() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { hasPermission } = useTeamRole();
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const items = useMemo(() => {
    const allowed = (STAYS_NAV_ITEMS as NavItem[])
      .filter((item) => !item.permission || hasPermission(item.permission))
      .map((item) =>
        item.children
          ? {
              ...item,
              children: item.children.filter((child) =>
                child.tab ? canOpenSettingsTab(hasPermission, child.tab) : true,
              ),
            }
          : item,
      );
    return flatten(allowed);
  }, [hasPermission]);

  const byPath = useMemo(() => new Map(items.map((item) => [item.path, item])), [items]);

  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const recent = useMemo(
    () => recentPaths.map((path) => byPath.get(path)).filter((item): item is FlatItem => Boolean(item)),
    [recentPaths, byPath],
  );

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return recent;
    const q = trimmed.toLowerCase();
    return items.filter((item) => searchableText(item).includes(q));
  }, [items, recent, trimmed]);

  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setRecentPaths(readRecent());
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, listId]);

  const goTo = (item: FlatItem) => {
    if (!byPath.has(item.path)) return; // only ever navigate to a page this role can open
    writeRecent([item.path, ...readRecent().filter((path) => path !== item.path && byPath.has(path))]);
    setOpen(false);
    navigate(item.path);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(results.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[active];
      if (target) goTo(target);
    }
  };

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? openPalette() : setOpen(false))}>
      {/* Phones: an icon button. Larger screens: a search field look-alike with the shortcut. */}
      <DialogPrimitive.Trigger asChild>
        <button type="button" aria-label="Search pages" className={cn(HEADER_ICON_BUTTON, "sm:hidden")}>
          <Search size={20} />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          className={cn(
            "hidden h-11 w-full items-center gap-2.5 rounded-control border border-hairline-strong bg-surface px-3.5 text-sm text-muted transition-colors sm:flex",
            "hover:border-slate-400 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Search size={16} className="shrink-0" />
          <span className="flex-1 truncate text-left">Search pages…</span>
          <kbd className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-sans text-caption font-semibold text-muted">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[calc(var(--preview-banner-height)+0.75rem)] z-(--z-overlay) flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 flex-col",
            "max-h-[min(36rem,calc(100dvh-var(--preview-banner-height)-1.5rem))] sm:top-[calc(var(--preview-banner-height)+12vh)]",
            "overflow-hidden rounded-sheet border border-hairline bg-surface-raised text-ink shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search pages</DialogPrimitive.Title>
          <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4">
            <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-label="Search pages"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
              placeholder="Search pages…"
              className="h-14 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-subtle sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                }}
                aria-label="Clear search"
                className={cn(HEADER_ICON_BUTTON, "-mr-2")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!trimmed && recent.length > 0 && (
              <p className="flex items-center gap-2 px-3 pb-1 pt-1.5 text-overline font-bold uppercase text-subtle">
                <Clock size={12} aria-hidden="true" /> Recent
              </p>
            )}
            {results.length > 0 ? (
              <ul id={listId} role="listbox" aria-label={trimmed ? "Matching pages" : "Recent pages"}>
                {results.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={item.path}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={() => goTo(item)}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm",
                        isActive ? "bg-brand-soft text-brand-ink" : "text-ink",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isActive ? "bg-surface text-brand-ink" : "bg-surface-strong text-muted",
                        )}
                      >
                        {Icon ? <Icon size={16} /> : <Search size={16} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{highlight(item.label, trimmed)}</span>
                        {item.parent && <span className="block truncate text-caption text-muted">in {item.parent}</span>}
                      </span>
                      {isActive && <CornerDownLeft size={14} className="shrink-0 opacity-70" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-10 text-center" role="status">
                <p className="text-sm font-semibold text-ink">{trimmed ? `No pages match “${trimmed}”` : "No recent pages yet"}</p>
                <p className="mt-1 text-caption text-muted">
                  {trimmed ? "Try another word, like “payout” or “calendar”." : "Start typing to find a page."}
                </p>
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center justify-between border-t border-hairline bg-surface-soft px-4 py-2.5 text-caption text-muted sm:flex">
            <span className="flex items-center gap-3">
              <span>
                <kbd className="font-sans font-semibold">↑</kbd> <kbd className="font-sans font-semibold">↓</kbd> to move
              </span>
              <span>
                <kbd className="font-sans font-semibold">↵</kbd> to open
              </span>
              <span>
                <kbd className="font-sans font-semibold">Esc</kbd> to close
              </span>
            </span>
            <span>{items.length} pages</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
