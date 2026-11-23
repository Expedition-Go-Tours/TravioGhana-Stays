import { useRef } from "react";

type AutoFocusHandler = (event: Event) => void;

/**
 * Focus return for dialogs and sheets that open without a Radix `Trigger`
 * (from a table row, a URL parameter, or another dialog's button).
 *
 * Radix sends focus back to its Trigger on close; with no Trigger it lands on
 * <body> and keyboard users lose their place. This remembers what had focus
 * when the overlay opened and returns there, unless the caller's own
 * `onCloseAutoFocus` already handled it (called `preventDefault`).
 */
export function useReturnFocus(onOpenAutoFocus?: AutoFocusHandler, onCloseAutoFocus?: AutoFocusHandler) {
  const previous = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: (event: Event) => {
      // Runs before Radix moves focus into the overlay.
      const active = document.activeElement;
      previous.current = active instanceof HTMLElement && active !== document.body ? active : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const target = previous.current;
      previous.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus({ preventScroll: true });
      }
    },
  };
}
