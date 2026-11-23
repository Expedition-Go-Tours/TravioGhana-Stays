import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import type { Tone } from "@/lib/statusTones";

/** The colour names call sites use (from `statusTone()`), mapped to semantic tones. */
const TONES: Record<string, Tone> = {
  green: "success",
  amber: "warning",
  blue: "info",
  red: "danger",
  slate: "neutral",
  gray: "neutral",
};

type StaysPillProps = {
  tone?: string;
  className?: string;
  children?: ReactNode;
};

/** Status chip with a dot — the shared `Badge`. */
export default function StaysPill({ tone = "green", className, children }: StaysPillProps) {
  return (
    <Badge tone={TONES[tone] ?? "neutral"} dot className={className}>
      {children}
    </Badge>
  );
}
