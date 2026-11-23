import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "@/features/stays/icons";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean;
};

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Spans every column of a parent grid. */
  wide?: boolean;
  className?: string;
  /** One form control. It receives the id and the aria wiring. */
  children: ReactNode;
};

/**
 * Label + control + hint/error, wired for assistive tech: the label names the
 * control (htmlFor/id), the hint or error describes it (aria-describedby),
 * and an error marks it invalid (aria-invalid). Clicking the label focuses
 * the control.
 */
export function Field({ label, hint, error, required = false, wide = false, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  const control = isValidElement<ControlProps>(children)
    ? cloneElement(children as ReactElement<ControlProps>, {
        id: children.props.id ?? id,
        "aria-describedby": message ? messageId : undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-required": required || undefined,
      })
    : children;
  const controlId = isValidElement<ControlProps>(children) ? (children.props.id ?? id) : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", wide && "col-span-full", className)}>
      {label && <FieldLabel htmlFor={controlId} required={required}>{label}</FieldLabel>}
      {control}
      {error ? (
        <p id={messageId} role="alert" className="flex items-start gap-1.5 text-caption font-medium text-danger">
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={messageId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldLabel({
  htmlFor,
  required = false,
  className,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-semibold text-ink", className)}>
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
