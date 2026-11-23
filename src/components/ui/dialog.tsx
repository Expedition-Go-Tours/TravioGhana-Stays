import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "@/features/stays/icons";
import { Button } from "./button";
import { useReturnFocus } from "./returnFocus";

/**
 * Modal dialog (Radix): focus moves in and is trapped, Escape and the
 * backdrop close it, background scroll is locked, and focus returns to the
 * trigger on close. Use for short tasks; use a Sheet for longer forms.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-(--z-overlay) bg-black/45 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
});

const SIZES = { sm: "max-w-[420px]", md: "max-w-[540px]", lg: "max-w-[780px]" } as const;

export type DialogContentProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  /** Hide the corner close button (the footer then must offer a way out). */
  hideClose?: boolean;
  overlayClassName?: string;
  bodyClassName?: string;
  /** Hairline above the footer (off for short confirm dialogs). */
  footerBorder?: boolean;
};

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  function DialogContent(
    {
      title,
      description,
      footer,
      size = "md",
      hideClose = false,
      className,
      overlayClassName,
      bodyClassName,
      footerBorder = true,
      children,
      onOpenAutoFocus,
      onCloseAutoFocus,
      ...props
    },
    ref,
  ) {
    const focusReturn = useReturnFocus(onOpenAutoFocus, onCloseAutoFocus);
    return (
      <DialogPrimitive.Portal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
          ref={ref}
          // Without a description Radix warns; pass `aria-describedby={undefined}` explicitly.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed left-1/2 top-1/2 z-(--z-overlay) flex max-h-[min(90dvh,56rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-sheet border border-hairline bg-surface-raised text-ink shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            SIZES[size],
            className,
          )}
          {...props}
          {...focusReturn}
        >
          {(title || !hideClose) && (
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0">
                {title && <DialogPrimitive.Title className="text-h2 font-bold text-ink">{title}</DialogPrimitive.Title>}
                {description && (
                  <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {!hideClose && (
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close" className="-mr-2 -mt-2 shrink-0">
                    <X size={18} />
                  </Button>
                </DialogPrimitive.Close>
              )}
            </div>
          )}
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
          {footer && <DialogFooter className={footerBorder ? undefined : "border-t-0 pt-2"}>{footer}</DialogFooter>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);

/** Actions row: full-width stacked on phones (primary last = nearest the thumb), inline from sm. */
export function DialogFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end sm:px-6",
        "[&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** `danger` for destructive actions (delete, sign out, cancel booking). */
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

/**
 * "Are you sure?" — an alert dialog. Focus starts on Cancel, so pressing
 * Enter by habit never deletes anything.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent
        role="alertdialog"
        size="sm"
        title={title}
        description={description}
        hideClose
        bodyClassName={children ? undefined : "flex-none py-2"}
        footerBorder={Boolean(children)}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary" disabled={loading} data-autofocus>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </>
        }
        onOpenAutoFocus={(event) => {
          // Focus Cancel rather than the first focusable (the confirm button).
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-autofocus]")?.focus();
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
