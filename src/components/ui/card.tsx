import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { cardVariants } from "./variants";


export type CardProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof cardVariants> & { as?: ElementType };

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as: Tag = "div", className, padding, interactive, ...props },
  ref,
) {
  return <Tag ref={ref} className={cn(cardVariants({ padding, interactive }), className)} {...props} />;
});

type SectionProps = HTMLAttributes<HTMLDivElement>;

/** Title row: title + description on the left, actions on the right. */
export function CardHeader({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: Omit<SectionProps, "title"> & { title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)} {...props}>
      <div className="min-w-0">
        {title && <h3 className="text-h3 font-bold text-ink">{title}</h3>}
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: SectionProps) {
  return <div className={cn("min-w-0", className)} {...props} />;
}

/** Footer row, separated by a hairline. */
export function CardFooter({ className, ...props }: SectionProps) {
  return (
    <div
      className={cn("mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4", className)}
      {...props}
    />
  );
}
