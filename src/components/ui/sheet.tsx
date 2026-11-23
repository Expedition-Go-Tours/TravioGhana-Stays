import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "@/features/stays/icons";
import { Button } from "./button";
import { DialogOverlay } from "./dialog";
import { useReturnFocus } from "./returnFocus";

/**
 * Side panel for longer tasks (booking details, filters, forms). Same
 * behaviour as Dialog — focus trap, Escape, scroll lock, focus return.
 *
 * `side="auto"` (default): a bottom sheet on phones, a right-hand panel from
 * `sm` up. Bottom sheets pad for the home indicator (safe-area inset).
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SIDES = {
  auto: cn(
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet border-t",
    "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
    "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(100vw,30rem)] sm:rounded-none sm:rounded-l-sheet sm:border-l sm:border-t-0",
    "sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right",
  ),
  right: cn(
    "inset-y-0 right-0 h-dvh w-[min(100vw,30rem)] rounded-l-sheet border-l",
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  ),
  left: cn(
    "inset-y-0 left-0 h-dvh w-[min(88vw,20rem)] rounded-r-sheet border-r",
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  ),
  bottom: cn(
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet border-t",
    "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
  ),
} as const;

export type SheetContentProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & {
  side?: keyof typeof SIDES;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
  bodyClassName?: string;
};

export const SheetContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  function SheetContent(
    { side = "auto", title, description, footer, hideClose = false, className, bodyClassName, children, onOpenAutoFocus, onCloseAutoFocus, ...props },
    ref,
  ) {
    const bottomOnPhones = side === "auto" || side === "bottom";
    const focusReturn = useReturnFocus(onOpenAutoFocus, onCloseAutoFocus);
    return (
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed z-(--z-overlay) flex flex-col border-hairline bg-surface-raised text-ink shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200",
            SIDES[side],
            className,
          )}
          {...props}
          {...focusReturn}
        >
          {bottomOnPhones && (
            <span
              aria-hidden="true"
              className={cn("mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300", side === "auto" && "sm:hidden")}
            />
          )}
          {(title || !hideClose) && (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
              <div className="min-w-0">
                {title && <DialogPrimitive.Title className="text-h3 font-bold text-ink">{title}</DialogPrimitive.Title>}
                {description && (
                  <DialogPrimitive.Description className="mt-0.5 text-sm text-muted">{description}</DialogPrimitive.Description>
                )}
              </div>
              {!hideClose && (
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close" className="-my-1.5 -mr-2 shrink-0">
                    <X size={18} />
                  </Button>
                </DialogPrimitive.Close>
              )}
            </div>
          )}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5",
              !footer && "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              bodyClassName,
            )}
          >
            {children}
          </div>
          {footer && (
            <div
              className={cn(
                "flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-5 pt-4 sm:flex-row sm:justify-end",
                "pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full sm:[&>*]:w-auto",
              )}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
