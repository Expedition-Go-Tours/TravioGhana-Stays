import type { ReactNode } from "react";
import {
  Field,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type InputProps,
  type TextareaProps,
} from "@/components/ui";

/**
 * Stays form controls — thin wrappers over the shared primitives in
 * "@/components/ui", kept so existing call sites keep their API.
 */
export function StaysField({
  label,
  hint,
  error,
  wide = false,
  className,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error} wide={wide} className={className}>
      {children}
    </Field>
  );
}

export function StaysInput(props: InputProps) {
  return <Input {...props} />;
}

export function StaysTextarea(props: TextareaProps) {
  return <Textarea {...props} />;
}

type Option = string | number | { value: string | number; label: ReactNode };

/** Options are bare strings or `{ value, label }` pairs. */
function normalizeOption(option: Option): { value: string; label: ReactNode } {
  if (option && typeof option === "object") return { value: String(option.value), label: option.label };
  return { value: String(option), label: String(option) };
}

type StaysSelectProps = {
  className?: string;
  options?: readonly Option[];
  value?: string | number | null;
  /** Native-select-shaped: reads `event.target.value`. */
  onChange?: (event: { target: { value: string } }) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

/**
 * The workspace dropdown (Radix Select) with a native-select-shaped API:
 * `options` plus an `onChange` that reads `event.target.value`. The field id
 * and aria wiring from `StaysField` land on the trigger.
 */
export function StaysSelect({
  className,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  name,
  required = false,
  ...triggerProps
}: StaysSelectProps) {
  return (
    <Select
      value={value == null ? "" : String(value)}
      onValueChange={(next) => onChange?.({ target: { value: next } })}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger className={className} {...triggerProps}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/* Portaled above dialogs and the builder's fixed overlay. */}
      <SelectContent>
        {options.map((option, index) => {
          const { value: optionValue, label } = normalizeOption(option);
          return (
            <SelectItem key={`${optionValue}-${index}`} value={optionValue}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
