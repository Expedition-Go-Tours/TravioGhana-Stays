import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui";

type StaysButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "default" | "small";
};

const VARIANT = { default: "secondary", primary: "primary", ghost: "ghost", danger: "dangerSoft" } as const;
const SIZE = { default: "md", small: "sm" } as const;

/**
 * The workspace's original button API, rendered by the shared `Button`.
 * New code should import `Button` from "@/components/ui" directly.
 */
const StaysButton = forwardRef<HTMLButtonElement, StaysButtonProps>(function StaysButton(
  { variant = "default", size = "default", ...props },
  ref,
) {
  return <Button ref={ref} variant={VARIANT[variant]} size={SIZE[size]} {...props} />;
});

export default StaysButton;
