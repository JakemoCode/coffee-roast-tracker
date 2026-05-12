import styles from "./FlavorPill.module.css";
import { hexToRgbString, readableTextColor } from "./colorContrast";
import { useTheme } from "../../providers/ThemeContext";

interface FlavorPillProps {
  name: string;
  color: string;
  variant?: "default" | "off-flavor";
  onRemove?: () => void;
}

// Page bg hex per theme — must mirror tokens.css / dark.css.
const PAGE_BG = { light: "#faf7f2", dark: "#1a1512" } as const;

export function FlavorPill({
  name,
  color,
  variant = "default",
  onRemove,
}: FlavorPillProps) {
  const { theme } = useTheme();
  const isOffFlavor = variant === "off-flavor";
  const bgOpacity = isOffFlavor ? 0.1 : 0.15;
  const rgb = hexToRgbString(color);

  const pillStyle = {
    backgroundColor: `rgba(${rgb}, ${bgOpacity})`,
    color: readableTextColor(color, { bg: PAGE_BG[theme], bgAlpha: bgOpacity }),
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
