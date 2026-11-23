import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: unknown;
};

/**
 * Native checkbox in the brand colour. With a label, the whole row (44px
 * minimum) is the tap target.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, error, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const labelId = `${inputId}-label`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const box = (
    <input
      ref={ref}
      id={inputId}
      type="checkbox"
      // The label text names it; the description describes it (not part of the name).
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={descriptionId}
      aria-invalid={error ? true : undefined}
      className={cn(
        "size-[18px] shrink-0 cursor-pointer rounded-[5px] accent-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !label && className,
      )}
      {...props}
    />
  );

  if (!label) return box;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 py-2.5 has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <span className="flex h-5 items-center">{box}</span>
      <span className="min-w-0">
        <span id={labelId} className="block text-sm font-medium text-ink">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="mt-0.5 block text-caption text-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});
