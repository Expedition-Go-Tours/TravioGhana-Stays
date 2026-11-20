import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SHELL_GUTTER, SHELL_MEASURE, SHELL_PADDING_Y, SHELL_SURFACE } from "./shell";

type PageContainerProps = {
  bleed?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * The dashboard's one and only content container.
 *
 * AppShell wraps <Outlet /> in this, so every page starts at the same left
 * edge as the header logo — see shell.ts for the rules pages must follow.
 *
 * `bleed` is for the routes that own their full-viewport layout (chat, the
 * property builder, property detail). They skip the container but still
 * import SHELL_GUTTER for their own chrome, so their content lines up too.
 */
export default function PageContainer({ bleed = false, className, children }: PageContainerProps) {
  if (bleed) {
    return <div className={cn(SHELL_SURFACE, className)}>{children}</div>;
  }

  return (
    <div className={cn(SHELL_SURFACE, SHELL_MEASURE, SHELL_GUTTER, SHELL_PADDING_Y, className)}>
      {children}
    </div>
  );
}
