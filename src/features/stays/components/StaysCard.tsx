import type { ElementType, ReactNode } from "react";
import { Card } from "@/components/ui";

type StaysCardProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
};

/**
 * The workspace's original card API (20px padding by default), rendered by the
 * shared `Card`. New code should use `Card` from "@/components/ui".
 */
export default function StaysCard({ as, className, children, ...props }: StaysCardProps) {
  return (
    <Card as={as} padding="md" className={className} {...props}>
      {children}
    </Card>
  );
}
