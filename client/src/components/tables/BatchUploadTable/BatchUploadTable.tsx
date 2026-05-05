import { formatDuration } from "../../../lib/formatters";
import styles from "./BatchUploadTable.module.css";

interface RoastPreviewMinimal {
  roastDate?: string | null;
  profileShortName?: string | null;
  totalDuration?: number | null;
  developmentPercent?: number | null;
  suggestedBeans: Array<{ bean: { id: string; name: string } }>;
  communityBeans: Array<{ id: string; name: string }>;
  parseWarnings: string[];
}

export interface BatchRow {
  fileName: string;
  fileContent: string;
  preview: RoastPreviewMinimal | null;
  error: string | null;
  saved: boolean;
}

interface BatchUploadTableProps {
  rows: BatchRow[];
  selectedBeanName?: string;
  onSaveAll: () => void;
  saving: boolean;
  saveProgress: { current: number; total: number } | null;
  canSave: boolean;
}

export function BatchUploadTable({
  rows,
  selectedBeanName,
  onSaveAll,
  saving,
  saveProgress,
  canSave,
}: BatchUploadTableProps) {
  const validRows = rows.filter((r) => !r.error);

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>File</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Profile</th>
            <th className={styles.th}>Duration</th>
            <th className={styles.th}>Bean</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${styles.row} ${row.error ? styles.errorRow : ""} ${row.saved ? styles.savedRow : ""}`}
              data-testid={`batch-row-${i}`}
            >
              {row.error ? (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={`${styles.td} ${styles.errorText}`} colSpan={4}>
                    {row.error}
                  </td>
                </>
              ) : (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={styles.td}>
                    {row.preview?.roastDate
                      ? new Date(row.preview.roastDate).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {row.preview?.profileShortName ?? "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {formatDuration(row.preview?.totalDuration)}
                  </td>
                  <td className={`${styles.td} ${!selectedBeanName ? styles.pendingBean : ""}`}>
                    {selectedBeanName ?? "Pending"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <div className={styles.saveSection}>
          {saveProgress && (
            <span className={styles.progressText}>
              Saving {saveProgress.current} of {saveProgress.total}…
            </span>
          )}
          <button
            type="button"
            className={styles.saveAllBtn}
            onClick={onSaveAll}
            disabled={!canSave}
          >
            Save All ({validRows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
