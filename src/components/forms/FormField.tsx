import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";

export type FormFieldProps = {
  label?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, wired for assistive tech (the shared `Field`). */
export default function FormField(props: FormFieldProps) {
  return <Field {...props} />;
}
