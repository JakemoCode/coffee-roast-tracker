import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.container} data-testid="not-found-page">
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 48h32v4a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4v-4Z"
              fill="var(--color-accent-caramel-muted)"
              stroke="var(--color-accent-caramel)"
              strokeWidth="2"
            />
            <path
              d="M12 24a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V24Z"
              fill="var(--color-bg-surface)"
              stroke="var(--color-accent-caramel)"
              strokeWidth="2"
            />
            <path
              d="M20 20c0-6 4-12 12-12s12 6 12 12"
              stroke="var(--color-accent-caramel)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse
              cx="32"
              cy="14"
              rx="3"
              ry="5"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </svg>
        </span>
        <h1 className={styles.heading}>404 — Page not found</h1>
        <Link to="/" className={styles.link}>
          Go to home page
        </Link>
      </div>
    </div>
  );
}
