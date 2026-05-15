import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthState } from "../../lib/useAuthState";
import { useNavigate } from "react-router-dom";
import { useSortableList } from "../../lib/useSortableList";
import {
  MY_BEANS_QUERY,
  MY_ROASTS_QUERY,
  PUBLIC_BEANS_QUERY,
  CREATE_BEAN,
  FLAVOR_DESCRIPTORS_QUERY,
  DISTINCT_SUPPLIERS_QUERY,
} from "../../graphql/operations";
import { BeanCard } from "../../components/BeanCard";
import { AddBeanModal } from "../../components/modals/AddBeanModal";
import { EmptyState } from "../../components/placeholders/EmptyState";
import { ErrorState } from "../../components/placeholders/ErrorState";
import { SkeletonLoader } from "../../components/placeholders/SkeletonLoader";
import type { ResultOf } from "../../graphql/graphql";
import styles from "./BeanLibraryPage.module.css";

type ViewMode = "card" | "table";
type BrowseMode = "my" | "community";

type MyBeanResult = ResultOf<typeof MY_BEANS_QUERY>["myBeans"][number];
type MyRoastResult = ResultOf<typeof MY_ROASTS_QUERY>["myRoasts"][number];

interface BeanAggregation {
  roastCount: number;
  avgRating: number | null;
}

function computeAggregations(roasts: MyRoastResult[]): Map<string, BeanAggregation> {
  const counts = new Map<string, { total: number; ratingSum: number; ratingCount: number }>();

  for (const roast of roasts) {
    const beanId = roast.bean.id;
    let entry = counts.get(beanId);
    if (!entry) {
      entry = { total: 0, ratingSum: 0, ratingCount: 0 };
      counts.set(beanId, entry);
    }
    entry.total++;
    if (roast.rating != null) {
      entry.ratingSum += roast.rating;
      entry.ratingCount++;
    }
  }

  const aggregations = new Map<string, BeanAggregation>();
  for (const [beanId, entry] of counts) {
    aggregations.set(beanId, {
      roastCount: entry.total,
      avgRating: entry.ratingCount > 0
        ? Math.round((entry.ratingSum / entry.ratingCount) * 10) / 10
        : null,
    });
  }

  return aggregations;
}

type SortField = "name" | "origin" | "process" | "variety" | "roastCount" | "avgRating";

interface BeanRow {
  id: string;
  name: string;
  origin: string | undefined;
  process: string | undefined;
  variety: string | undefined;
  roastCount: number | undefined;
  avgRating: number | undefined;
}

const BEAN_SORT_BY: Record<SortField, (b: BeanRow) => string | number | null | undefined> = {
  name: (b) => b.name,
  origin: (b) => b.origin,
  process: (b) => b.process,
  variety: (b) => b.variety,
  roastCount: (b) => b.roastCount,
  avgRating: (b) => b.avgRating,
};

function beanSearchPredicate(b: BeanRow, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    b.name.toLowerCase().includes(lower) ||
    (b.origin?.toLowerCase().includes(lower) ?? false) ||
    (b.process?.toLowerCase().includes(lower) ?? false)
  );
}

export function BeanLibraryPage() {
  const { isSignedIn } = useAuthState();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [browseMode, setBrowseMode] = useState<BrowseMode>("my");
  const [showAddBean, setShowAddBean] = useState(false);

  const showCommunity = !isSignedIn || browseMode === "community";

  const [createBean] = useMutation(CREATE_BEAN, {
    refetchQueries: [{ query: MY_BEANS_QUERY }, { query: DISTINCT_SUPPLIERS_QUERY }],
  });

  const {
    data: myBeansData,
    loading: myBeansLoading,
    error: myBeansError,
    refetch: refetchMyBeans,
  } = useQuery(MY_BEANS_QUERY, { skip: showCommunity });

  const { data: roastsData, loading: roastsLoading } = useQuery(MY_ROASTS_QUERY, {
    skip: showCommunity,
  });

  const {
    data: publicBeansData,
    loading: publicBeansLoading,
    error: publicBeansError,
    refetch: refetchPublicBeans,
  } = useQuery(PUBLIC_BEANS_QUERY, {
    variables: { limit: 50 },
    skip: !showCommunity,
  });

  const { data: flavorData } = useQuery(FLAVOR_DESCRIPTORS_QUERY);
  const flavorList = (flavorData?.flavorDescriptors ?? []).map((f: { name: string; color: string }) => ({
    name: f.name,
    color: f.color,
  }));

  const { data: suppliersData } = useQuery(DISTINCT_SUPPLIERS_QUERY, { fetchPolicy: "cache-first" });
  const supplierList = suppliersData?.distinctSuppliers ?? [];

  const loading = showCommunity ? publicBeansLoading : myBeansLoading || roastsLoading;
  const error = showCommunity ? publicBeansError : myBeansError;
  const refetch = showCommunity ? refetchPublicBeans : refetchMyBeans;

  const myBeans = myBeansData?.myBeans ?? [];
  const publicBeans = publicBeansData?.publicBeans ?? [];
  const roasts = (roastsData?.myRoasts ?? []) as MyRoastResult[];
  const aggregations = computeAggregations(roasts);

  const myBeanCards = myBeans.map((ub: MyBeanResult) => {
    const agg = aggregations.get(ub.bean.id);
    return {
      id: ub.bean.id,
      name: ub.bean.name,
      origin: ub.bean.origin ?? undefined,
      process: ub.bean.process ?? undefined,
      variety: ub.bean.variety ?? undefined,
      roastCount: agg?.roastCount,
      avgRating: agg?.avgRating ?? undefined,
    };
  });

  const publicBeanCards: BeanRow[] = publicBeans.map((b) => ({
    id: b.id,
    name: b.name,
    origin: b.origin ?? undefined,
    process: b.process ?? undefined,
    variety: b.variety ?? undefined,
    roastCount: undefined,
    avgRating: undefined,
  }));

  const beanCards: BeanRow[] = showCommunity ? publicBeanCards : myBeanCards;

  // Table view: search + sort state owned by useSortableList. Indicator
  // glyph is rendered locally so this table can keep its \u2195 for inactive
  // columns (RoastsTable shows nothing for inactive \u2014 different product
  // decision, kept distinct by design).
  const {
    rows: tableRows,
    search: tableSearch,
    setSearch: setTableSearch,
    sortField,
    sortDir,
    handleSort,
  } = useSortableList<BeanRow, SortField>({
    items: beanCards,
    searchPredicate: beanSearchPredicate,
    sortBy: BEAN_SORT_BY,
  });

  function sortIndicator(field: SortField) {
    if (sortField !== field) return " \u2195";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  }

  if (loading) {
    return (
      <div className={styles.page} data-testid="bean-library-loading">
        <SkeletonLoader variant="card" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <ErrorState
          message="Failed to load beans"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isEmpty = beanCards.length === 0;

  return (
    <div className={styles.page} data-testid="bean-library">
      <div className={styles.toolbar}>
        <h1 className={styles.title}>
          {isSignedIn && browseMode === "my" ? "My Beans" : "Bean Library"}
        </h1>
        <div className={styles.actions}>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "card" ? styles.toggleActive : ""}`}
              onClick={() => setViewMode("card")}
              aria-pressed={viewMode === "card"}
            >
              Cards
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "table" ? styles.toggleActive : ""}`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              Table
            </button>
          </div>
          {isSignedIn && (
            <button
              type="button"
              className={styles.browseBtn}
              onClick={() =>
                setBrowseMode((m) => (m === "my" ? "community" : "my"))
              }
            >
              {browseMode === "my" ? "Browse Community" : "My Beans"}
            </button>
          )}
          {isSignedIn && (
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setShowAddBean(true)}
              data-testid="add-bean-btn"
            >
              + Add Bean
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<span aria-hidden="true">&#9749;</span>}
          message={
            isSignedIn
              ? "Add your first bean or browse community beans"
              : "No beans in the library yet"
          }
          action={
            isSignedIn
              ? { label: "+ Add Bean", onClick: () => setShowAddBean(true) }
              : undefined
          }
        />
      ) : viewMode === "card" ? (
        <div className={styles.grid} data-testid="bean-card-grid">
          {showCommunity
            ? publicBeans.map((bean) => (
                <BeanCard
                  key={bean.id}
                  beanRef={{ __typename: "Bean" as const, id: bean.id }}
                />
              ))
            : myBeans.map((ub) => {
                const agg = aggregations.get(ub.bean.id);
                return (
                  <BeanCard
                    key={ub.bean.id}
                    beanRef={{ __typename: "Bean" as const, id: ub.bean.id }}
                    roastCount={agg?.roastCount}
                    avgRating={agg?.avgRating ?? undefined}
                  />
                );
              })}
        </div>
      ) : (
        <div className={styles.tableContainer} data-testid="bean-table">
          <div className={styles.tableToolbar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search beans..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              data-testid="table-search"
            />
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => handleSort("name")}>
                  Name{sortIndicator("name")}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort("origin")}>
                  Origin{sortIndicator("origin")}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort("process")}>
                  Process{sortIndicator("process")}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort("variety")}>
                  Variety{sortIndicator("variety")}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort("roastCount")}>
                  Roast Count{sortIndicator("roastCount")}
                </th>
                <th className={styles.sortableHeader} onClick={() => handleSort("avgRating")}>
                  Avg Rating{sortIndicator("avgRating")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((bean) => (
                <tr
                  key={bean.id}
                  className={styles.clickableRow}
                  onClick={() => navigate(`/beans/${bean.id}`)}
                >
                  <td className={styles.nameCell}>{bean.name}</td>
                  <td>{bean.origin ?? "\u2014"}</td>
                  <td>{bean.process ?? "\u2014"}</td>
                  <td>{bean.variety ?? "\u2014"}</td>
                  <td>{bean.roastCount ?? "\u2014"}</td>
                  <td>{bean.avgRating != null ? `\u2605 ${bean.avgRating}` : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddBean && (
        <AddBeanModal
          isOpen={showAddBean}
          onClose={() => setShowAddBean(false)}
          onSave={async (bean) => {
            await createBean({ variables: { input: bean } });
            setShowAddBean(false);
          }}
          flavors={flavorList}
          suppliers={supplierList}
        />
      )}
    </div>
  );
}
