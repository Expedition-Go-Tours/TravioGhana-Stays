import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, X, CornerDownLeft } from "@/features/stays/icons";
import { useTeamRole } from "@/hooks/useTeamRole";
import { canOpenSettingsTab } from "@/config/pageAccess";
import { cn } from "@/lib/utils";
import { STAYS_NAV_ITEMS } from "@/config/staysNav";

type NavChild = { label: string; tab: string; keywords?: string[] };

type NavItem = {
  label: string;
  path: string;
  iconName?: string;
  permission?: string | null;
  keywords?: string[];
  children?: NavChild[];
};

type FlatItem = NavItem & { parent?: string; path: string };

const SEARCHABLE_TEXT = (item: FlatItem) =>
  [item.label, item.parent, item.keywords || []].flat().join(" ").toLowerCase();

function flattenNavItems(items: NavItem[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const item of items) {
    out.push(item as FlatItem);
    if (item.children) {
      for (const child of item.children) {
        out.push({
          label: child.label,
          parent: item.label,
          path: `${item.path}?tab=${child.tab}`,
          iconName: item.iconName,
          permission: item.permission,
          keywords: [...(item.keywords || []), ...(child.keywords || [])],
        });
      }
    }
  }
  return out;
}

const RECENT_KEY = "stays-search-recent";
const MAX_RECENT = 6;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistRecent(recent: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function saveRecent(path: string, validPaths: Set<string>) {
  if (!validPaths.has(path)) return;
  const recent = getRecent().filter((p) => p !== path);
  recent.unshift(path);
  persistRecent(recent);
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#044b3b]/10 text-[#044b3b] rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3a3]">{children}</span>
    </div>
  );
}

export default function SearchDropdown() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { hasPermission } = useTeamRole();

  const navItems = useMemo(() => {
    const filtered = (STAYS_NAV_ITEMS as NavItem[])
      .filter((item) => !item.permission || hasPermission(item.permission))
      .map((item) => (item.children
        ? { ...item, children: item.children.filter((child) => canOpenSettingsTab(hasPermission, child.tab)) }
        : item))
      .filter((item) => !item.children || item.children.length > 0);
    return flattenNavItems(filtered);
  }, [hasPermission]);

  const validPaths = useMemo(() => new Set(navItems.map((i) => i.path)), [navItems]);

  const recentItems = useMemo(() => {
    if (!open) return [];
    const raw = getRecent();
    const valid = raw.filter((p) => validPaths.has(p));
    if (valid.length !== raw.length) {
      persistRecent(valid);
    }
    return valid
      .map((path) => navItems.find((i) => i.path === path))
      .filter((item): item is FlatItem => Boolean(item));
  }, [open, validPaths, navItems]);

  const pageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return navItems.filter((i) => SEARCHABLE_TEXT(i).includes(q));
  }, [navItems, query]);

  const displayItems = useMemo(
    () => (query.trim() ? pageResults : recentItems),
    [query, pageResults, recentItems]
  );

  const isEmpty = displayItems.length === 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setHighlight(0);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }, []);

  const goTo = useCallback(
    (path: string) => {
      if (!validPaths.has(path)) {
        console.warn(`[SearchDropdown] Navigation blocked: path "${path}" not in permission-filtered items`);
        return;
      }
      saveRecent(path, validPaths);
      close();
      navigate(path);
    },
    [navigate, validPaths, close],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, displayItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = displayItems[highlight];
      if (target) goTo(target.path);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <div className="relative w-auto sm:w-full" ref={containerRef}>
      <button
        onClick={() => {
          if (!open) {
            setHighlight(0);
            setQuery("");
          }
          setOpen(!open);
        }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl text-sm transition-all duration-200",
          "border-0 bg-transparent px-1.5 sm:border sm:bg-white sm:px-3 sm:w-full",
          open
            ? "text-[#044b3b] sm:border-[#044b3b]/40 sm:ring-2 sm:ring-[#044b3b]/10 sm:text-[#1e293b] sm:shadow"
            : "text-[#64748b] sm:border-[#eaeaea] sm:hover:border-[#044b3b]/30 sm:hover:text-[#1e293b]",
        )}
        aria-label="Search pages"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="hidden sm:inline">{query || "Search…"}</span>
        {!open && (
          <kbd className="hidden sm:inline-block rounded-md border border-[#eaeaea] bg-[#f8fafc] px-1.5 py-0.5 text-[10px] font-medium text-[#64748b]">
            ⌘K
          </kbd>
        )}
        <Search className="h-3.5 w-3.5 ml-auto" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="fixed sm:absolute top-16 sm:top-full sm:mt-2 left-4 sm:left-0 right-4 sm:right-auto sm:w-full min-w-0 sm:min-w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#eaeaea] bg-white shadow-lg z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Search pages"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-[#eaeaea] px-4">
              <Search className="h-4 w-4 shrink-0 text-[#94a3a0]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search pages…"
                className="h-12 w-full bg-transparent py-3 text-sm text-[#1e293b] placeholder:text-[#94a3a0] outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setHighlight(0); }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[#94a3a3] hover:bg-[#f1f5f5] hover:text-[#1e293b] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden shrink-0 rounded-md border border-[#eaeaea] bg-[#f8fafc] px-1.5 py-0.5 text-[10px] font-medium text-[#64748b] sm:block">
                ESC
              </kbd>
            </div>

            {/* Results / Recent */}
            <div className="max-h-[400px] overflow-y-auto p-1.5">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8fafc] border border-[#eaeaea] mb-3">
                    <Search className="h-4 w-4 text-[#94a3a3]" />
                  </div>
                  <p className="text-sm font-medium text-[#64748b]">
                    {query.trim() ? `No results for "${query}"` : "No recent searches"}
                  </p>
                  <p className="text-xs text-[#94a3a3] mt-1">
                    {query.trim() ? "Try a different search term" : "Start typing to search pages"}
                  </p>
                </div>
              ) : (
                <>
                  {!query.trim() && recentItems.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <Clock className="h-3 w-3 text-[#94a3a3]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3a3]">
                        Recent
                      </span>
                    </div>
                  )}
                  {displayItems.map((item, idx) => (
                    <Fragment key={item.path}>
                      {query.trim() && idx === 0 && <SectionHeader>Pages</SectionHeader>}
                      <button
                        onClick={() => goTo(item.path)}
                        onMouseEnter={() => setHighlight(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          idx === highlight
                            ? "bg-[#044b3b]/5 text-[#044b3b]"
                            : "text-[#1e293b] hover:bg-[#f8fafc]",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium">
                            {highlightMatch(item.label, query.trim())}
                          </span>
                          {item.parent && (
                            <span className="truncate text-[11px] text-[#94a3a3]">
                              in {item.parent}
                            </span>
                          )}
                        </span>
                        {item.iconName && (
                          <span className="shrink-0 text-xs text-[#94a3a3]">
                            {item.iconName.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        )}
                        {idx === highlight && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        )}
                      </button>
                    </Fragment>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#eaeaea] px-4 py-2.5 bg-[#f8fafc]">
              <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#eaeaea] bg-white px-1 py-0.5 text-[10px] font-medium">↑</kbd>
                  <kbd className="rounded border border-[#eaeaea] bg-white px-1 py-0.5 text-[10px] font-medium">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[#eaeaea] bg-white px-1 py-0.5 text-[10px] font-medium">↵</kbd>
                  select
                </span>
              </div>
              <span className="text-[10px] text-[#94a3a3]">{navItems.length} pages</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
