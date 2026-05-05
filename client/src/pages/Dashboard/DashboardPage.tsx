import { useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  MY_ROASTS_QUERY,
  MY_BEANS_QUERY,
  UPDATE_ROAST_RATING,
} from "../../graphql/operations";
import { useTempUnit } from "../../providers/AppProviders";
import { StatChips } from "./StatChips";
import { RoastsTable } from "../../components/RoastsTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLoader } from "../../components/SkeletonLoader";
import { CoffeeCupIcon } from "./CoffeeCupIcon";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const { tempUnit } = useTempUnit();

  const {
    data: roastData,
    loading: roastsLoading,
    error: roastsError,
    refetch: refetchRoasts,
  } = useQuery(MY_ROASTS_QUERY);

  const { data: beanData } = useQuery(MY_BEANS_QUERY);

  const [updateRating] = useMutation(UPDATE_ROAST_RATING);

  const roasts = roastData?.myRoasts ?? [];

  const uniqueBeans = useMemo(() => {
    const seen = new Map<string, string>();
    for (const roast of roasts) {
      if (!seen.has(roast.bean.id)) {
        seen.set(roast.bean.id, roast.bean.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [roasts]);

  const avgRating = useMemo(() => {
    const rated = roasts.filter((r) => r.rating != null);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return sum / rated.length;
  }, [roasts]);

  const topBean = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const roast of roasts) {
      const entry = counts.get(roast.bean.id);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(roast.bean.id, { name: roast.bean.name, count: 1 });
      }
    }
    let best = "";
    let bestCount = 0;
    for (const { name, count } of counts.values()) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    return best || "N/A";
  }, [roasts]);

  function handleRatingChange(roastId: string, rating: number) {
    updateRating({ variables: { id: roastId, input: { rating } } });
  }

  function handleCompare(selectedIds: string[]) {
    navigate(`/compare?ids=${selectedIds.join(",")}`);
  }

  function handleRowClick(roastId: string) {
    navigate(`/roasts/${roastId}`);
  }

  function handleUploadClick() {
    navigate("/?upload=true");
  }

  if (roastsLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Roasts</h1>
        <SkeletonLoader variant="card" count={3} />
        <SkeletonLoader variant="table-row" count={5} />
      </div>
    );
  }

  if (roastsError) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Roasts</h1>
        <ErrorState
          message={`Failed to load roasts: ${roastsError.message}`}
          onRetry={() => refetchRoasts()}
        />
      </div>
    );
  }

  if (roasts.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Roasts</h1>
        <EmptyState
          icon={<CoffeeCupIcon />}
          message="No roasts yet — upload your first roast to get started"
          action={{ label: "Upload", onClick: handleUploadClick }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>My Roasts</h1>

      <RoastsTable
        roasts={roasts}
        searchable
        filterable
        sortable
        selectable
        beans={uniqueBeans}
        pageSize={8}
        onCompare={handleCompare}
        onRatingChange={handleRatingChange}
        onRowClick={handleRowClick}
        tempUnit={tempUnit}
      />

      <StatChips
        totalRoasts={roasts.length}
        avgRating={avgRating}
        topBean={topBean}
      />
    </div>
  );
}
