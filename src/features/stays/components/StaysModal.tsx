import type { ReactNode } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui";

type StaysModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** 780px instead of 540px (rate plans). */
  wide?: boolean;
  children?: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
};

/**
 * The workspace's original modal API, rendered by the shared `Dialog` (focus
 * trap, Escape, scroll lock, a close button). New code should use
 * `Dialog`/`DialogContent` from "@/components/ui".
 */
export default function StaysModal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  wide = false,
  children,
  contentClassName,
  overlayClassName,
}: StaysModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={wide ? "lg" : "md"}
        title={title}
        description={description}
        footer={footer}
        className={contentClassName}
        overlayClassName={overlayClassName}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Wraps a button so it closes the surrounding modal. */
export function StaysModalClose({ children }: { children: ReactNode }) {
  return <DialogClose asChild>{children}</DialogClose>;
}
