import { cloneElement, forwardRef, isValidElement, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders its single child instead of its own element, merging props and
 * classes onto it — the `asChild` pattern (`<Button asChild><Link …/></Button>`).
 */
export const Slot = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { children?: ReactNode }>(
  function Slot({ children, className, ...props }, ref) {
    if (!isValidElement<{ className?: string; ref?: Ref<HTMLElement> }>(children)) return null;
    return cloneElement(children, {
      ...props,
      ...children.props,
      className: cn(className, children.props.className),
      ref,
    });
  },
);
