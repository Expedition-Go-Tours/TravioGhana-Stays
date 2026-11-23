import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "@/features/stays/icons";
import { Slot } from "./slot";
import { buttonVariants } from "./variants";


export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a router Link) with button styling. */
    asChild?: boolean;
    /** Shows a spinner, disables the button and sets aria-busy. */
    loading?: boolean;
    children?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild = false, loading = false, disabled, type = "button", children, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonProps, "size" | "asChild"> & {
  /** Required: an icon-only button has no visible text to name it. */
  "aria-label": string;
  size?: "icon" | "iconSm";
};

/** Icon-only button. 44px by default; the label is mandatory. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "icon", ...props },
  ref,
) {
  return <Button ref={ref} variant={variant} size={size} {...props} />;
});
