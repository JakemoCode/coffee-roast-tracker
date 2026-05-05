import styles from "./SkeletonLoader.module.css";

type SkeletonVariant = "text" | "card" | "table-row" | "circle";

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
  width?: string;
  height?: string;
}

const variantClassMap: Record<SkeletonVariant, string> = {
  text: styles.text ?? "",
  card: styles.card ?? "",
  "table-row": styles.tableRow ?? "",
  circle: styles.circle ?? "",
};

export function SkeletonLoader({
  variant = "text",
  count = 1,
  width,
  height,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i);
  const variantClass = variantClassMap[variant];

  return (
    <div className={styles.container} data-testid="skeleton" aria-busy="true" aria-label="Loading">
      {items.map((i) => (
        <div
          key={i}
          className={`${styles.bone} ${variantClass}`}
          style={{ width, height }}
        />
      ))}
    </div>
  );
}
