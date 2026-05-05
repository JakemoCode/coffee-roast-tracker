import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export function Modal({ isOpen, onClose, title, children, footer, wide }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const hasFocusedRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) {
      hasFocusedRef.current = false;
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);

    // Hide underlying content from assistive tech and Playwright locators
    const root = document.getElementById("root");
    if (root) {
      root.setAttribute("inert", "");
      root.style.visibility = "hidden";
    }

    // Focus the modal container only on initial open, not on every re-render.
    // hasFocusedRef prevents focus theft from child inputs when handleKeyDown
    // identity changes (e.g. inline onClose prop) cause the effect to re-run.
    let timer: number | undefined;
    if (!hasFocusedRef.current) {
      timer = requestAnimationFrame(() => {
        modalRef.current?.focus();
        hasFocusedRef.current = true;
      });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timer != null) cancelAnimationFrame(timer);
      if (root) {
        root.removeAttribute("inert");
        root.style.visibility = "";
      }
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      data-testid="modal-backdrop"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button
            className={styles.closeBtn}
            aria-label="Close modal"
            onClick={onClose}
          >
            &#215;
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
