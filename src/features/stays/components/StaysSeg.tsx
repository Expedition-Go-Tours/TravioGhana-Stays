import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollFade } from "@/components/ui";

type Option = { value: string; label: ReactNode };

type StaysSegProps = {
  options: Option[];
  value: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  /** chips: filter row · tabs: underline sections · segmented: compact pill switch */
  variant?: "chips" | "tabs" | "segmented";
  className?: string;
};

const ITEM = {
  chips: cn(
    "h-11 rounded-full border px-4 text-sm font-semibold sm:h-9 sm:px-3.5",
    "border-hairline-strong bg-surface text-body hover:border-slate-400 hover:text-ink",
    "aria-selected:border-brand aria-selected:bg-brand aria-selected:text-on-brand",
  ),
  tabs: cn(
    "relative h-11 px-3 text-sm font-semibold text-muted hover:text-ink",
    "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent",
    "aria-selected:text-ink aria-selected:after:bg-brand",
  ),
  segmented: cn(
    "h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:text-ink",
    "aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-xs",
  ),
} as const;

const LIST = {
  chips: "gap-2",
  tabs: "gap-1",
  segmented: "gap-0.5 rounded-xl bg-surface-strong p-1",
} as const;

/**
 * A single-choice switch for filters and views. It changes what the page
 * shows rather than revealing separate panels, so it uses tab semantics with
 * arrow-key movement (roving focus) but no panel wiring.
 */
export default function StaysSeg({ options, value, onChange, ariaLabel, variant = "chips", className }: StaysSegProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange?.(options[next].value);
  };

  const list = (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex items-center", variant !== "segmented" && "w-max", LIST[variant], className)}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange?.(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              ITEM[variant],
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "segmented") return list;
  return <ScrollFade className={cn(variant === "tabs" && "border-b border-hairline")}>{list}</ScrollFade>;
}
