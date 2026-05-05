import styles from "./EmptyState.module.css";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className={styles.container} data-testid="empty-state">
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <p className={styles.message}>{message}</p>
      {action && (
        <button className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
