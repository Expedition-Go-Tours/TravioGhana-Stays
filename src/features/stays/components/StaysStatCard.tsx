import type { ReactNode } from "react";
import { StatCard } from "@/components/ui";

type StaysStatCardProps = {
  label?: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "emerald" | "amber";
  compact?: boolean;
  className?: string;
};

/** The workspace's original stat tile API, rendered by the shared `StatCard`. */
export default function StaysStatCard({ label, value, hint, icon, accent = "emerald", className }: StaysStatCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={accent === "amber" ? "accent" : "brand"}
      className={className}
    />
  );
}
