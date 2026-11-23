import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  /** With a label the whole row (44px minimum) toggles the switch. */
  label?: ReactNode;
  description?: ReactNode;
};

/**
 * On/off switch (Radix): role="switch", Space/Enter toggle, aria-checked.
 * Use for settings that apply immediately; use a Checkbox inside forms that
 * are saved with a button.
 */
export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(function Switch(
  { className, label, description, id, ...props },
  ref,
) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  const control = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      aria-describedby={descriptionId}
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "bg-slate-300 transition-colors duration-150 data-[state=checked]:bg-brand",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        !label && className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0",
          "transition-transform duration-150 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (!label) return control;

  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4 py-2", className)}>
      <div className="min-w-0 flex-1">
        {/* Only the label text names the switch; the description describes it. */}
        <label htmlFor={switchId} className="block cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-caption text-muted">
            {description}
          </p>
        )}
      </div>
      {control}
    </div>
  );
});
