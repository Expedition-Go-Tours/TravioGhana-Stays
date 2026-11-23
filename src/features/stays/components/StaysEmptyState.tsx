import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

type StaysEmptyStateProps = {
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** The workspace's original empty-state API, rendered by the shared `EmptyState`. */
export default function StaysEmptyState({ title, children, icon, action, className }: StaysEmptyStateProps) {
  return <EmptyState compact title={title} description={children} icon={icon} action={action} className={className} />;
}
