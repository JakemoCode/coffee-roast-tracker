import styles from "./StatChips.module.css";

interface StatChipsProps {
  totalRoasts: number;
  avgRating: number;
  topBean: string;
}

interface ChipData {
  label: string;
  value: string;
}

export function StatChips({ totalRoasts, avgRating, topBean }: StatChipsProps) {
  const chips: ChipData[] = [
    { label: "Total Roasts", value: String(totalRoasts) },
    { label: "Avg Rating", value: avgRating.toFixed(1) },
    { label: "Top Bean", value: topBean },
  ];

  return (
    <div className={styles.container} data-testid="stat-chips">
      {chips.map((chip) => (
        <div key={chip.label} className={styles.chip}>
          <span className={styles.label}>{chip.label}</span>
          <span className={styles.value}>{chip.value}</span>
        </div>
      ))}
    </div>
  );
}
