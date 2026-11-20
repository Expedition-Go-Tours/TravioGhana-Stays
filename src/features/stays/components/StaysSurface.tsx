import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysSurfaceProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Root wrapper for every Stays page.
 *
 * Kept as a component so pages have one place to hang workspace-wide classes
 * if they are ever needed again; today it renders the page's content.
 */
export default function StaysSurface({ children, className }: StaysSurfaceProps) {
  return <div className={cn(className)}>{children}</div>;
}
