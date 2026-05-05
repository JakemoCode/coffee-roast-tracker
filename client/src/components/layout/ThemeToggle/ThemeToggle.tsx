import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      className={styles.toggle}
      onClick={onToggle}
      aria-label="Toggle theme"
      data-testid="theme-toggle"
    >
      <span className={styles.icon} aria-hidden="true">
        {theme === "light" ? "\u2600\uFE0F" : "\u{1F319}"}
      </span>
    </button>
  );
}
