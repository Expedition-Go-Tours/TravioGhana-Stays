import { cn } from "@/lib/utils";
import { AlertCircle } from "@/features/stays/icons";

/**
 * FormError component for displaying field-level errors
 */
export default function FormError({ className, children, ...props }) {
  if (!children) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-sm text-red-600",
        className
      )}
      role="alert"
      {...props}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
