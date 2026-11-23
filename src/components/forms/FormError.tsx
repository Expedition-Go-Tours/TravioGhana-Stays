import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "@/features/stays/icons";

/** A field-level error, announced to screen readers. Renders nothing when empty. */
export default function FormError({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  if (!children) return null;
  return (
    <div className={cn("flex items-start gap-1.5 text-caption font-medium text-danger", className)} role="alert" {...props}>
      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
