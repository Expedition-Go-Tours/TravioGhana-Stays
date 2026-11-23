import type { ReactNode } from "react";
import { ConfirmDialog } from "./dialog";

type DeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  description?: ReactNode;
  entityName?: string;
  isLoading?: boolean;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
};

/**
 * "Delete X?" — the original API, now an accessible alert dialog
 * (`ConfirmDialog`): focus starts on Cancel, Escape closes it.
 */
export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete product",
  description,
  entityName = "",
  isLoading = false,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: DeleteModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={
        description ?? (
          <>
            {entityName ? (
              <>
                <span className="font-semibold text-ink">&ldquo;{entityName}&rdquo;</span> will be deleted.
              </>
            ) : (
              "This item will be deleted."
            )}{" "}
            This can&apos;t be undone.
          </>
        )
      }
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      loading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
