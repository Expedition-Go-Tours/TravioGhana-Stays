// @ts-nocheck
// Migration marker: ported from JavaScript; props/data shapes are not annotated yet.
// Remove this directive once the file is typed — `npm run typecheck` then enforces it.
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import FormLabel from "./FormLabel";
import FormError from "./FormError";

export type FormFieldProps = {
  label?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

/**
 * FormField wrapper component for consistent form field styling.
 */
export default function FormField({
  label,
  error,
  required = false,
  hint,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && <FormLabel required={required}>{label}</FormLabel>}

      {children}

      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}

      {error && <FormError>{error}</FormError>}
    </div>
  );
}
