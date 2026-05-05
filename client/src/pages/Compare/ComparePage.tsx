import "../../lib/chartSetup";
import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import type { TimeSeriesEntry } from "../../components/RoastChart";
import { ROASTS_BY_IDS_QUERY } from "../../graphql/operations";
import { useTempUnit } from "../../providers/AppProviders";
import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import { celsiusToFahrenheit } from "../../lib/tempConversion";
import { StarRating } from "../../components/StarRating";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLoader } from "../../components/SkeletonLoader";
import styles from "./ComparePage.module.css";

const COMPARE_COLORS = ["#5a3e2b", "#c27a8a", "#5a7247", "#c4862a", "#7a4a6e"];
const PHASE_PADDING = 12; // seconds of breathing room on each side of a zoom
type PhaseZoom = "all" | "dry" | "maillard" | "dev";

type DatasetKey = "meanTemp" | "profileTemp" | "ror" | "fanRPM" | "powerKW" | "spotTemp";

const DATASET_TYPES: Array<{ key: DatasetKey; label: string; isTempField: boolean }> = [
  { key: "meanTemp", label: "Mean Temp", isTempField: true },
  { key: "profileTemp", label: "Profile Target", isTempField: true },
  { key: "ror", label: "RoR", isTempField: false },
  { key: "fanRPM", label: "Fan RPM", isTempField: false },
  { key: "powerKW", label: "Power kW", isTempField: false },
  { key: "spotTemp", label: "Spot Temp", isTempField: true },
];

function getFieldValue(entry: TimeSeriesEntry, key: DatasetKey): number | undefined {
  switch (key) {
    case "meanTemp": return entry.meanTemp ?? entry.temp;
    case "profileTemp": return entry.profileTemp;
    case "ror": return entry.actualROR;
    case "fanRPM": return entry.actualFanRPM;
    case "powerKW": return entry.powerKW;
    case "spotTemp": return entry.spotTemp;
  }
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const { tempUnit } = useTempUnit();
  const idsParam = searchParams.get("ids");
  const ids = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam],
  );

  const { data, loading, error, refetch } = useQuery(ROASTS_BY_IDS_QUERY, {
    variables: { ids },
    skip: ids.length < 2,
  });

  const roasts = data?.roastsByIds ?? [];
  const [phaseZoom, setPhaseZoom] = useState<PhaseZoom>("all");
  const [activeDataset, setActiveDataset] = useState<DatasetKey>("meanTemp");

  // Use the first roast's markers as reference for phase zoom
  const ref = roasts[0];
  const hasMarkers = ref && ref.colourChangeTime != null && ref.firstCrackTime != null && ref.roastEndTime != null;

  const xRange = useMemo(() => {
    if (!hasMarkers || phaseZoom === "all") return undefined;
    const cc = ref!.colourChangeTime!;
    const fc = ref!.firstCrackTime!;
    const end = ref!.roastEndTime!;
    switch (phaseZoom) {
      case "dry":
        return { min: Math.max(0, 0 - PHASE_PADDING), max: cc + PHASE_PADDING };
      case "maillard":
        return { min: cc - PHASE_PADDING, max: fc + PHASE_PADDING };
      case "dev":
        return { min: fc - PHASE_PADDING, max: end + PHASE_PADDING };
    }
  }, [phaseZoom, hasMarkers, ref]);

  const activeDatasetConfig = DATASET_TYPES.find((d) => d.key === activeDataset)!;

  const chartData = useMemo<ChartData<"line">>(() => {
    const datasets = roasts.map((roast, i) => {
      const series = (roast.timeSeriesData ?? []) as Array<TimeSeriesEntry>;
      return {
        label: `${formatDate(roast.roastDate)} · ${roast.bean?.name ?? "Unknown"}`,
        data: series.map((d) => {
          const raw = getFieldValue(d, activeDataset);
          const y = raw != null && activeDatasetConfig.isTempField && tempUnit === "FAHRENHEIT"
            ? celsiusToFahrenheit(raw)
            : raw;
          return { x: d.time, y: y ?? null };
        }),
        borderColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
      };
    });
    return { datasets };
  }, [roasts, tempUnit, activeDataset, activeDatasetConfig]);

  const yAxisLabel = activeDatasetConfig.isTempField
    ? (tempUnit === "FAHRENHEIT" ? "Temperature (\u00b0F)" : "Temperature (\u00b0C)")
    : activeDatasetConfig.label;

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            title(items) {
              const raw = items[0]?.parsed?.x;
              return raw != null ? formatDuration(raw) : "";
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear" as const,
          min: xRange?.min,
          max: xRange?.max,
          ticks: {
            callback(value) {
              return formatDuration(value as number);
            },
          },
          title: { display: true, text: "Time" },
        },
        y: {
          type: "linear" as const,
          position: "left" as const,
          title: { display: true, text: yAxisLabel },
        },
      },
    }),
    [yAxisLabel, xRange],
  );

  // No IDs provided
  if (ids.length < 2) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <p className={styles.empty}>
          Select roasts to compare from the dashboard
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <ErrorState
          message={`Error loading roasts: ${error.message}`}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="compare-page">
      <Link to="/" className={styles.backLink}>&larr; My Roasts</Link>
      <h1 className={styles.title}>Compare Roasts</h1>

      {/* Legend — clickable links to individual roast detail */}
      <div className={styles.legend}>
        {roasts.map((roast, i) => (
          <Link
            key={roast.id}
            to={`/roasts/${roast.id}`}
            className={styles.legendLink}
          >
            <span
              className={styles.legendDot}
              style={{
                backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
              }}
            />
            {formatDate(roast.roastDate)} &middot; {roast.bean?.name ?? "Unknown"}
          </Link>
        ))}
      </div>

      {/* Dataset selector */}
      <div className={styles.zoomControls}>
        {DATASET_TYPES.map((dt) => (
          <button
            key={dt.key}
            type="button"
            className={`${styles.zoomBtn} ${activeDataset === dt.key ? styles.zoomBtnActive : ""}`}
            onClick={() => setActiveDataset(dt.key)}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Phase zoom controls */}
      {hasMarkers && (
        <div className={styles.zoomControls}>
          {(["all", "dry", "maillard", "dev"] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              className={`${styles.zoomBtn} ${phaseZoom === phase ? styles.zoomBtnActive : ""}`}
              onClick={() => setPhaseZoom(phase)}
            >
              {phase === "all" ? "Full" : phase.charAt(0).toUpperCase() + phase.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className={styles.chartContainer} data-testid="compare-chart">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Comparison metrics table */}
      <table className={styles.metricsTable} data-testid="compare-metrics">
        <thead>
          <tr>
            <th>Roast</th>
            <th>Bean</th>
            <th>Duration</th>
            <th>Dev Time</th>
            <th>DTR%</th>
            <th>FC Temp</th>
            <th>End Temp</th>
            <th>Dev {"\u0394"}T</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {roasts.map((roast, i) => {
            const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
            const dtr =
              roast.developmentTime != null && roast.totalDuration
                ? ((roast.developmentTime / roast.totalDuration) * 100).toFixed(1)
                : null;
            const delta =
              roast.firstCrackTemp != null && roast.roastEndTemp != null
                ? roast.roastEndTemp - roast.firstCrackTemp
                : null;
            return (
              <tr
                key={roast.id}
                className={styles.roastRow}
                style={{ borderLeftColor: color }}
              >
                <td className={styles.roastLabel}>
                  {formatDate(roast.roastDate)}
                </td>
                <td>{roast.bean?.name ?? "\u2014"}</td>
                <td>{formatDuration(roast.totalDuration)}</td>
                <td>{formatDuration(roast.developmentTime)}</td>
                <td>{dtr != null ? `${dtr}%` : "\u2014"}</td>
                <td>{formatTemp(roast.firstCrackTemp, tempUnit)}</td>
                <td>{formatTemp(roast.roastEndTemp, tempUnit)}</td>
                <td>{delta != null ? formatTemp(delta, tempUnit) : "\u2014"}</td>
                <td><StarRating value={roast.rating ?? 0} readOnly size="sm" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
