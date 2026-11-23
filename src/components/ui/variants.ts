/**
 * Style recipes and helpers shared by the primitives. Kept out of the
 * component files so those export only components (React fast refresh).
 */
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "@/lib/statusTones";

/**
 * Buttons. Forest green (`primary`) is the one action colour — use it once per
 * view for the main action. Controls are 10px-radius; `md` is 44px tall (the
 * minimum touch target), `sm` 36px for dense rows.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold",
    "transition-colors duration-150 select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand shadow-xs hover:bg-brand-hover",
        secondary: "border border-hairline-strong bg-surface text-ink shadow-xs hover:border-slate-400 hover:bg-surface-soft",
        ghost: "text-body hover:bg-surface-strong hover:text-ink",
        danger: "bg-danger-fill text-white shadow-xs hover:bg-danger-fill-hover",
        dangerSoft: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
        link: "text-brand-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

/**
 * Content card: 16px corners, hairline border, a soft shadow in light mode
 * (dark mode relies on the border). `padding="none"` for cards whose body is
 * a table or a list that runs edge to edge.
 */
export const cardVariants = cva("rounded-card border border-hairline bg-surface text-ink shadow-xs", {
  variants: {
    padding: { none: "", sm: "p-4", md: "p-5", lg: "p-6" },
    interactive: {
      true: "transition-[box-shadow,border-color] hover:border-hairline-strong hover:shadow-md focus-within:border-hairline-strong",
    },
  },
  defaultVariants: { padding: "md" },
});

/**
 * A small tinted chip for statuses and tags. Colour comes from a semantic
 * tone, never a hex value; text sits on its own tint, so it reads in both themes.
 */
export const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none",
  {
    variants: {
      tone: {
        success: TONE_CLASSES.success.chip,
        warning: TONE_CLASSES.warning.chip,
        danger: TONE_CLASSES.danger.chip,
        info: TONE_CLASSES.info.chip,
        neutral: TONE_CLASSES.neutral.chip,
        brand: TONE_CLASSES.brand.chip,
        accent: TONE_CLASSES.accent.chip,
      },
      size: {
        sm: "px-2 py-1 text-caption",
        md: "px-2.5 py-1.5 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

/**
 * Text inputs share one look: 44px tall, 10px radius, a stronger hairline that
 * darkens on hover, and the brand ring on focus. `aria-invalid` (set by the
 * `error` prop or by <Field>) turns the border red.
 */
export const controlClasses = cn(
  "w-full min-w-0 rounded-control border border-hairline-strong bg-surface px-3.5 text-sm text-ink shadow-xs",
  "placeholder:text-subtle transition-[border-color,box-shadow] duration-150",
  "hover:border-slate-400",
  "focus:outline-none focus-visible:outline-none focus:border-brand focus:ring-3 focus:ring-ring/20",
  "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted disabled:hover:border-hairline-strong",
  "aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/20",
);

/** Booking.com's word for a review score out of 10. */
export function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 8) return "Very good";
  if (score >= 7) return "Good";
  if (score >= 6) return "Pleasant";
  return "Review score";
}

/** "Ama Kofi Boateng" → "AB"; "Travio Stays (demo)" → "TS" (brackets and symbols ignored). */
export function initialsOf(name: string | null | undefined): string {
  const parts = String(name || "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
