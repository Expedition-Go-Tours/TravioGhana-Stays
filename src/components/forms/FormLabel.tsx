import { cn } from "@/lib/utils";

/**
 * FormLabel component for form field labels
 */
export default function FormLabel({ 
  required = false, 
  className, 
  children,
  ...props 
}) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-slate-700",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
