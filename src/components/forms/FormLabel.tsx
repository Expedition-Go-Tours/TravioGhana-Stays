import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FormLabelProps = LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean };

/** A form label; the asterisk marks required fields visually. */
export default function FormLabel({ required = false, className, children, ...props }: FormLabelProps) {
  return (
    <label className={cn("block text-sm font-semibold text-ink", className)} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
