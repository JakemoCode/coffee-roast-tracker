import { useState, useMemo, useEffect } from "react";
import { useFragment } from "@apollo/client/react";
import { graphql } from "../../../graphql/graphql";
import type { FragmentOf } from "../../../graphql/graphql";
import { StarRating } from "../../StarRating";
import { Pagination } from "./Pagination";
import { formatDuration, formatTemp, formatDate } from "../../../lib/formatters";
import type { TempUnit } from "../../../lib/formatters";
import { useSortableList } from "../../../lib/useSortableList";
import styles from "./RoastsTable.module.css";

export const ROAST_ROW_FIELDS = graphql(`
  fragment RoastRowFields on Roast @_unmask {
    id
    roastDate
    rating
    totalDuration
    firstCrackTemp
    developmentPercent
    bean { id name }
  }
`);

type RoastRow = FragmentOf<typeof ROAST_ROW_FIELDS>;

interface RoastsTableProps {
  roasts: RoastRow[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  beans?: Array<{ id: string; name: string }>;
  pageSize?: number;
  selectable?: boolean;
  maxSelections?: number;
  minSelections?: number;
  onCompare?: (selectedIds: string[]) => void;
  onRatingChange?: (roastId: string, rating: number) => void;
  onRowClick?: (roastId: string) => void;
  tempUnit?: TempUnit;
  hideBeanName?: boolean;
}

type SortField = "beanName" | "roastDate" | "rating" | "totalDuration" | "firstCrackTemp" | "developmentPercent";

const SORT_BY: Record<SortField, (r: RoastRow) => string | number | null> = {
  beanName: (r) => r.bean.name,
  roastDate: (r) => r.roastDate,
  rating: (r) => r.rating,
  totalDuration: (r) => r.totalDuration,
  firstCrackTemp: (r) => r.firstCrackTemp,
  developmentPercent: (r) => r.developmentPercent,
};

function searchPredicate(r: RoastRow, q: string): boolean {
  return r.bean.name.toLowerCase().includes(q.toLowerCase());
}

interface RoastTableRowProps {
  roastRef: { __typename: "Roast"; id: string };
  selectable?: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onToggleSelect?: (id: string) => void;
  onRatingChange?: (roastId: string, rating: number) => void;
  onRowClick?: (roastId: string) => void;
  tempUnit: TempUnit;
  hideBeanName?: boolean;
}

function RoastTableRow({
  roastRef,
  selectable,
  isSelected,
  isDisabled,
  onToggleSelect,
  onRatingChange,
  onRowClick,
  tempUnit,
  hideBeanName,
}: RoastTableRowProps) {
  const { data: roast } = useFragment({
    fragment: ROAST_ROW_FIELDS,
    from: roastRef,
  });

  const id = roast.id ?? roastRef.id;
  const beanName = roast.bean?.name ?? "";

  return (
    <tr
      data-testid="roast-row"
      className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${onRowClick ? styles.clickable : ""}`}
      onClick={() => onRowClick?.(id)}
    >
      {selectable && (
        <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={isDisabled}
              onChange={() => onToggleSelect?.(id)}
              aria-label={`Select ${beanName}`}
            />
          </label>
        </td>
      )}
      {!hideBeanName && <td className={styles.beanNameCell}>{beanName}</td>}
      <td>{formatDate(roast.roastDate)}</td>
      <td className={styles.ratingCell} onClick={(e) => e.stopPropagation()}>
        <StarRating
          value={roast.rating ?? 0}
          onChange={onRatingChange ? (rating) => onRatingChange(id, rating) : undefined}
          readOnly={!onRatingChange}
          size="sm"
        />
      </td>
      <td>{formatDuration(roast.totalDuration)}</td>
      <td>{formatTemp(roast.firstCrackTemp, tempUnit)}</td>
      <td>
        {roast.developmentPercent != null
          ? `${roast.developmentPercent.toFixed(1)}%`
          : "—"}
      </td>
    </tr>
  );
}

export function RoastsTable({
  roasts,
  searchable = false,
  filterable = false,
  sortable = false,
  beans,
  pageSize = 10,
  selectable = false,
  maxSelections = 5,
  minSelections = 2,
  onCompare,
  onRatingChange,
  onRowClick,
  tempUnit = "CELSIUS",
  hideBeanName = false,
}: RoastsTableProps) {
  const [beanFilter, setBeanFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Apply the bean-id filter first; the hook then runs search + sort over
  // whatever survives. Bean filter stays here because useSortableList's
  // search predicate doesn't know about external dropdown state.
  const beanFiltered = useMemo(() => {
    if (!filterable || !beanFilter) return roasts;
    const matchingBean = beans?.find((b) => b.id === beanFilter);
    return roasts.filter((r) =>
      matchingBean ? r.bean.name === matchingBean.name : r.bean.name === beanFilter,
    );
  }, [roasts, beanFilter, filterable, beans]);

  const {
    rows: sorted,
    search,
    setSearch,
    sortField,
    sortDir,
    handleSort: handleSortHook,
  } = useSortableList<RoastRow, SortField>({
    items: beanFiltered,
    searchPredicate,
    sortBy: SORT_BY,
  });

  // Pagination is a RoastsTable-only concern. Reset to page 1 whenever
  // the visible set could shift (search, sort, or bean filter changed).
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortField, sortDir, beanFilter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function handleSort(field: SortField) {
    if (!sortable) return;
    handleSortHook(field);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const atLimit = selected.size >= maxSelections;

  function sortIndicator(field: SortField) {
    if (!sortable || sortField !== field) return null;
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function handleSearchChange(value: string) {
    if (!searchable) return;
    setSearch(value);
  }

  return (
    <div className={styles.container} data-testid="roasts-table">
      {selectable && (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.compareButton}
            disabled={selected.size < minSelections}
            onClick={() => onCompare?.(Array.from(selected))}
            title={selected.size < 2 ? "Select at least 2 roasts to compare" : undefined}
          >
            Compare ({selected.size})
          </button>
          {atLimit && (
            <span className={styles.limitMessage}>
              Maximum of {maxSelections} selections reached
            </span>
          )}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            {selectable && <th className={styles.checkboxCol}></th>}
            {!hideBeanName && (
              <th
                className={sortable ? styles.sortableHeader : undefined}
                onClick={() => handleSort("beanName")}
              >
                Bean Name{sortIndicator("beanName")}
              </th>
            )}
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("roastDate")}
            >
              Date{sortIndicator("roastDate")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("rating")}
            >
              Rating{sortIndicator("rating")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("totalDuration")}
            >
              Time{sortIndicator("totalDuration")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("firstCrackTemp")}
            >
              FC Temp{sortIndicator("firstCrackTemp")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("developmentPercent")}
            >
              DTR%{sortIndicator("developmentPercent")}
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((roast) => {
            const isSelected = selected.has(roast.id);
            const isDisabled = !isSelected && atLimit;
            return (
              <RoastTableRow
                key={roast.id}
                roastRef={{ __typename: "Roast" as const, id: roast.id }}
                selectable={selectable}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onToggleSelect={toggleSelect}
                onRatingChange={onRatingChange}
                onRowClick={onRowClick}
                tempUnit={tempUnit}
                hideBeanName={hideBeanName}
              />
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {(searchable || (filterable && beans)) && (
        <div className={styles.toolbar}>
          {searchable && (
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search roasts..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="search-input"
            />
          )}
          {filterable && beans && (
            <select
              className={styles.beanFilter}
              value={beanFilter}
              onChange={(e) => setBeanFilter(e.target.value)}
              data-testid="bean-filter"
              aria-label="Filter by bean"
            >
              <option value="">All beans</option>
              {beans.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export type { RoastRow, RoastsTableProps };
