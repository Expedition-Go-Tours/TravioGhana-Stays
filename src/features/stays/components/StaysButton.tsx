import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type StaysButtonProps = {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "default" | "small";
  className?: string;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The dashboard's button language.
 *
 * Interactive elements are pills (100px radius); containers are 24px cards.
 * Primary is the one Travio green the product has always used — the design
 * system's single brand voltage, kept rather than replaced.
 */
const VARIANTS = {
  default:
    "border border-hairline bg-canvas text-ink hover:border-slate-300 hover:bg-surface-soft",
  primary:
    "border border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 active:border-emerald-800 active:bg-emerald-800",
  ghost:
    "border border-transparent bg-transparent text-body hover:bg-surface-soft hover:text-ink",
  danger:
    "border border-red-200 bg-canvas text-down hover:border-red-300 hover:bg-red-50",
};

const SIZES = {
  default: "h-11 px-5 text-sm",
  small: "h-8 px-3 text-xs",
};

export default function StaysButton({
  variant = "default",
  size = "default",
  className,
  type = "button",
  children,
  ...props
}: StaysButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
