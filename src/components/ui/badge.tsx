import type { HTMLAttributes, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { statusEntry, TONE_CLASSES, type StatusDomain, type Tone } from "@/lib/statusTones";
import { badgeVariants } from "./variants";


export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    /** Leading status dot. */
    dot?: boolean;
    icon?: ReactNode;
  };

export function Badge({ tone, size, dot = false, icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_CLASSES[(tone ?? "neutral") as Tone].dot)} />}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export type StatusBadgeProps = Omit<BadgeProps, "tone" | "children"> & {
  domain: StatusDomain;
  status: string | null | undefined;
  /** Override the label from the status map. */
  label?: ReactNode;
};

/** A badge for a known status — tone and label come from `lib/statusTones`. */
export function StatusBadge({ domain, status, label, dot = true, ...props }: StatusBadgeProps) {
  const entry = statusEntry(domain, status);
  return (
    <Badge tone={entry.tone} dot={dot} {...props}>
      {label ?? entry.label}
    </Badge>
  );
}
