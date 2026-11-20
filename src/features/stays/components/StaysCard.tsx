import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysCardProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
};

/**
 * The dashboard's standard content card.
 *
 * Coinbase geometry: 24px corners, a 1px hairline border and the system's one
 * shadow tier. No decorative depth — layering comes from the surface, not
 * from stacked shadows.
 */
export default function StaysCard({ as: Tag = "div", className, children, ...props }: StaysCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-hairline bg-canvas p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
