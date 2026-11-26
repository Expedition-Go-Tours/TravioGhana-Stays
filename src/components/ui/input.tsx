import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./variants";


type ErrorProp = { error?: unknown };

function invalid(error: unknown, ariaInvalid: unknown) {
  return Boolean(error) || ariaInvalid === true || ariaInvalid === "true" ? true : undefined;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> &
  ErrorProp & {
    /** Element inside the left edge (icon, currency code). */
    leading?: ReactNode;
    /** Element inside the right edge (unit, clear button). */
    trailing?: ReactNode;
  };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", error, leading, trailing, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid(error, ariaInvalid)}
      className={cn(controlClasses, "h-11", leading && "pl-10", trailing && "pr-10", className)}
      {...props}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative min-w-0">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted">
          {leading}
        </span>
      )}
      {input}
      {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted">{trailing}</span>}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & ErrorProp;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, rows = 4, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid(error, ariaInvalid)}
      className={cn(controlClasses, "min-h-24 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});
