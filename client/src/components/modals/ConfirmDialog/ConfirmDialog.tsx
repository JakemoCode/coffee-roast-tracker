import { Modal } from "../Modal";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClassName = [
    styles.btn,
    styles.confirmBtn,
    variant === "danger" ? styles.danger : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!isOpen) return null;

  return (
    <div data-testid="confirm-dialog" role="alertdialog" aria-label={title}>
      <Modal
        isOpen={isOpen}
        title={title}
        onClose={onCancel}
        footer={
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.cancelBtn}`}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={confirmClassName}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        }
      >
        <p className={styles.message}>{message}</p>
      </Modal>
    </div>
  );
}
