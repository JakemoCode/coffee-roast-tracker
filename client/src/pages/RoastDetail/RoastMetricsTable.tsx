import { graphql } from "../../graphql/graphql";
import type { FragmentOf } from "../../graphql/graphql";
import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import styles from "./RoastMetricsTable.module.css";

export const ROAST_METRIC_FIELDS = graphql(`
  fragment RoastMetricFields on Roast @_unmask {
    id
    roastDate
    totalDuration
    colourChangeTime
    colourChangeTemp
    firstCrackTime
    firstCrackTemp
    developmentTime
    developmentPercent
    roastEndTemp
  }
`);

export type RoastMetric = FragmentOf<typeof ROAST_METRIC_FIELDS>;

interface RoastMetricsTableProps {
  /** The current roast — always highlighted */
  currentRoastId: string;
  /** All roasts to display (current + others) */
  roasts: RoastMetric[];
  /** IDs of roasts currently overlaid on the chart */
  compareIds: string[];
  /** Toggle a roast in/out of the compare overlay */
  onToggleCompare: (id: string) => void;
  /** Navigate to a roast */
  onRowClick: (id: string) => void;
  tempUnit: TempUnit;
}

export function RoastMetricsTable({
  currentRoastId,
  roasts,
  compareIds,
  onToggleCompare,
  onRowClick,
  tempUnit,
}: RoastMetricsTableProps) {
  return (
    <div className={styles.wrapper} data-testid="metrics-table">
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}></th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Duration</th>
            <th className={styles.th}>
              <span title="Time when colour change begins (end of drying phase)">Dry End</span>
            </th>
            <th className={styles.th}>
              <span title="First Crack — when beans audibly crack from internal steam pressure">FC Time</span>
            </th>
            <th className={styles.th}>
              <span title="Bean temperature at First Crack">FC Temp</span>
            </th>
            <th className={styles.th}>
              <span title="Development Time — duration from First Crack to end of roast">Dev Time</span>
            </th>
            <th className={styles.th}>
              <span title="Development Time Ratio — dev time as % of total roast duration">DTR</span>
            </th>
            <th className={styles.th}>End Temp</th>
          </tr>
        </thead>
        <tbody>
          {roasts.map((r) => {
            const isCurrent = r.id === currentRoastId;
            const isCompared = compareIds.includes(r.id);
            return (
              <tr
                key={r.id}
                className={`${styles.row} ${isCurrent ? styles.currentRow : styles.clickableRow} ${isCompared ? styles.comparedRow : ""}`}
                onClick={() => !isCurrent && onRowClick(r.id)}
              >
                <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                  {!isCurrent && (
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => onToggleCompare(r.id)}
                        aria-label={`Compare with ${formatDate(r.roastDate)}`}
                      />
                    </label>
                  )}
                </td>
                <td className={styles.td}>
                  {isCurrent ? (
                    <strong>{formatDate(r.roastDate)}</strong>
                  ) : (
                    formatDate(r.roastDate)
                  )}
                </td>
                <td className={styles.td}>{formatDuration(r.totalDuration)}</td>
                <td className={styles.td}>{formatDuration(r.colourChangeTime)}</td>
                <td className={styles.td}>{formatDuration(r.firstCrackTime)}</td>
                <td className={styles.td}>{formatTemp(r.firstCrackTemp, tempUnit)}</td>
                <td className={styles.td}>{formatDuration(r.developmentTime)}</td>
                <td className={styles.td}>{r.developmentPercent != null ? `${r.developmentPercent.toFixed(1)}%` : "—"}</td>
                <td className={styles.td}>{formatTemp(r.roastEndTemp, tempUnit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
