import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    const dismiss = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      onDismiss(toast.id);
    };

    // Small delay so the triggering interaction doesn't immediately dismiss
    const timer = setTimeout(() => {
      window.addEventListener("click", dismiss, { once: true });
      window.addEventListener("keydown", dismiss, { once: true });
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.variant]}`}
      role="status"
      aria-live="polite"
      data-testid="toast"
    >
      <span className={styles.message}>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className={styles.container} aria-label="Notifications">
            {toasts.map((toast) => (
              <ToastMessage key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
