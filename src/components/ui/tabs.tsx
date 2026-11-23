import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Tabs (Radix): arrow keys move between tabs, Home/End jump, and each tab is
 * wired to its panel. Keep the selected tab in the URL with `useTabParam`.
 *
 * Two looks: `underline` (page sections, Booking extranet style) and `pill`
 * (compact filters inside a card). Long lists scroll sideways with fade
 * edges that show there is more.
 */
export const Tabs = TabsPrimitive.Root;
export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn("outline-none", className)} {...props} />;
});

type Variant = "underline" | "pill";

const LIST = {
  underline: "gap-1 border-b border-hairline",
  pill: "gap-1 rounded-xl bg-surface-strong p-1",
} as const;

const TRIGGER = {
  underline: cn(
    "relative h-11 px-3 text-sm font-semibold text-muted hover:text-ink",
    "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent",
    "data-[state=active]:text-ink data-[state=active]:after:bg-brand",
  ),
  pill: cn(
    "h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:text-ink",
    "data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-xs",
  ),
} as const;

/** Horizontal scroller with fade edges when content overflows. */
export function ScrollFade({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft > 2, end: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const mask =
    edges.start && edges.end
      ? "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      : edges.start
        ? "[mask-image:linear-gradient(to_right,transparent,black_24px)]"
        : edges.end
          ? "[mask-image:linear-gradient(to_left,transparent,black_24px)]"
          : "";

  return (
    <div ref={ref} onScroll={measure} className={cn("scrollbar-none overflow-x-auto", mask, className)}>
      {children}
    </div>
  );
}

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: Variant }
>(function TabsList({ className, variant = "underline", ...props }, ref) {
  return (
    <ScrollFade className={variant === "underline" ? "border-b border-hairline" : undefined}>
      <TabsPrimitive.List
        ref={ref}
        className={cn("inline-flex min-w-full items-center", LIST[variant], variant === "underline" && "border-b-0", className)}
        {...props}
      />
    </ScrollFade>
  );
});

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: Variant; count?: number }
>(function TabsTrigger({ className, variant = "underline", count, children, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        TRIGGER[variant],
        className,
      )}
      {...props}
    >
      {children}
      {typeof count === "number" && (
        <span className="figures min-w-5 rounded-full bg-surface-strong px-1.5 py-0.5 text-center text-caption font-bold text-body">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
