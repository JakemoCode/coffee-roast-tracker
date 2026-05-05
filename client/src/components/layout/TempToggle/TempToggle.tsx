import styles from "./TempToggle.module.css";

interface TempToggleProps {
  unit: "CELSIUS" | "FAHRENHEIT";
  onToggle: () => void;
}

export function TempToggle({ unit, onToggle }: TempToggleProps) {
  const label = unit === "CELSIUS" ? "\u00B0C" : "\u00B0F";

  return (
    <button
      className={styles.toggle}
      onClick={onToggle}
      data-testid="temp-toggle"
      aria-label={`Switch to ${unit === "CELSIUS" ? "Fahrenheit" : "Celsius"}`}
    >
      {label}
    </button>
  );
}
