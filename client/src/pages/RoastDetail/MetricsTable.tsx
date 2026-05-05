import { formatDuration, formatTemp } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import { graphql } from "../../graphql/graphql";
import type { FragmentOf } from "../../graphql/graphql";
import styles from "./MetricsTable.module.css";

export const METRICS_FIELDS = graphql(`
  fragment MetricsFields on Roast @_unmask {
    totalDuration
    colourChangeTime
    colourChangeTemp
    firstCrackTime
    firstCrackTemp
    developmentTime
    developmentPercent
    roastEndTemp
    rating
  }
`);

export type Metrics = FragmentOf<typeof METRICS_FIELDS> & { label?: string };

interface MetricsTableProps {
  metrics: Metrics;
  tempUnit: TempUnit;
  compareMetrics?: Metrics[];
}

interface MetricCol {
  key: string;
  label: string;
  tooltip?: string;
  format: (m: Metrics) => string;
}

const COLUMNS: MetricCol[] = [
  { key: "totalDuration", label: "Duration", format: (m) => formatDuration(m.totalDuration) },
  { key: "dryEnd", label: "Dry End", tooltip: "Time when colour change begins (end of drying phase)", format: (m) => formatDuration(m.colourChangeTime) },
  { key: "firstCrackTime", label: "FC Time", tooltip: "First Crack — when beans audibly crack from internal steam pressure", format: (m) => formatDuration(m.firstCrackTime) },
  { key: "developmentTime", label: "Dev Time", tooltip: "Development Time — duration from First Crack to end of roast", format: (m) => formatDuration(m.developmentTime) },
  { key: "developmentPercent", label: "DTR", tooltip: "Development Time Ratio — dev time as % of total roast duration", format: (m) => m.developmentPercent != null ? `${m.developmentPercent.toFixed(1)}%` : "—" },
];

function formatMetricTemp(m: Metrics, field: "firstCrackTemp" | "roastEndTemp" | "colourChangeTemp", tempUnit: TempUnit): string {
  return formatTemp(m[field], tempUnit);
}

export function MetricsTable({ metrics, tempUnit, compareMetrics = [] }: MetricsTableProps) {
  // Compare mode: table with rows per roast, columns per metric
  if (compareMetrics.length > 0) {
    const allMetrics = [metrics, ...compareMetrics];
    const tempCols: MetricCol[] = [
      { key: "dryEndTemp", label: "DE Temp", format: (m) => formatMetricTemp(m, "colourChangeTemp", tempUnit) },
      { key: "firstCrackTemp", label: "FC Temp", tooltip: "Bean temperature at First Crack", format: (m) => formatMetricTemp(m, "firstCrackTemp", tempUnit) },
      { key: "endTemp", label: "End Temp", format: (m) => formatMetricTemp(m, "roastEndTemp", tempUnit) },
    ];
    const cols = [...COLUMNS, ...tempCols];

    return (
      <div className={styles.compareWrapper} data-testid="metrics-table">
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th className={styles.compareHeader}>Roast</th>
              {cols.map((col) => (
                <th key={col.key} className={styles.compareHeader} title={col.tooltip}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMetrics.map((m, i) => (
              <tr key={i} className={styles.compareRow}>
                <td className={styles.compareLabel}>{m.label ?? (i === 0 ? "This roast" : `Roast ${i + 1}`)}</td>
                {cols.map((col) => (
                  <td key={col.key} className={styles.compareValue}>{col.format(m)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Single roast mode: original label/value layout
  const rows = [
    { label: "Total Duration", value: formatDuration(metrics.totalDuration) },
    { label: "Dry End", value: formatDuration(metrics.colourChangeTime), tooltip: "Time when colour change begins (end of drying phase)" },
    { label: "Dry End Temp", value: formatTemp(metrics.colourChangeTemp, tempUnit) },
    { label: "FC Time", value: formatDuration(metrics.firstCrackTime), tooltip: "First Crack — when beans audibly crack from internal steam pressure" },
    { label: "FC Temp", value: formatTemp(metrics.firstCrackTemp, tempUnit), tooltip: "Bean temperature at First Crack" },
    { label: "Dev Time", value: formatDuration(metrics.developmentTime), tooltip: "Development Time — duration from First Crack to end of roast" },
    { label: "DTR", value: metrics.developmentPercent != null ? `${metrics.developmentPercent.toFixed(1)}%` : "—", tooltip: "Development Time Ratio — dev time as % of total roast duration" },
    { label: "End Temp", value: formatTemp(metrics.roastEndTemp, tempUnit) },
    { label: "Rating", value: metrics.rating != null ? `${metrics.rating}/10` : "—" },
  ];

  return (
    <div className={styles.table} data-testid="metrics-table">
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label} title={row.tooltip}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
