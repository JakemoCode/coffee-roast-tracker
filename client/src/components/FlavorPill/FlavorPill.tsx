import styles from "./FlavorPill.module.css";
import { hexToRgbString, readableTextColor } from "./colorContrast";

interface FlavorPillProps {
  name: string;
  color: string;
  variant?: "default" | "off-flavor";
  onRemove?: () => void;
}

export function FlavorPill({
  name,
  color,
  variant = "default",
  onRemove,
}: FlavorPillProps) {
  const isOffFlavor = variant === "off-flavor";
  const bgOpacity = isOffFlavor ? 0.1 : 0.15;
  const rgb = hexToRgbString(color);

  const pillStyle = {
    backgroundColor: `rgba(${rgb}, ${bgOpacity})`,
    color: readableTextColor(color),
    borderColor: isOffFlavor ? `rgba(${rgb}, 0.4)` : "transparent",
  };

  const className = [styles.pill, isOffFlavor ? styles.offFlavor : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={pillStyle}
      data-testid="flavor-pill"
      title={name}
    >
      <span
        className={styles.dot}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className={styles.name}>{name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          {"✕"}
        </button>
      )}
    </span>
  );
}
