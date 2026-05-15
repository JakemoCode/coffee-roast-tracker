import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/** Comparable values the hook knows how to order. Null sorts to the end. */
type SortKey = string | number | null | undefined;

interface UseSortableListOptions<T, F extends string> {
  /** The full, unfiltered collection. */
  items: readonly T[];
  /** Returns true if `item` matches the free-text `query`. Called with the
   *  raw query string — case folding is the caller's responsibility. */
  searchPredicate: (item: T, query: string) => boolean;
  /** Per-sort-field comparator key extractor. Returning null/undefined
   *  sorts that row to the end regardless of direction. */
  sortBy: Record<F, (item: T) => SortKey>;
  /** Initial sort field. Default: no sort applied. */
  initialSortField?: F | null;
  /** Initial sort direction. Default: "asc". */
  initialSortDir?: SortDir;
}

export interface UseSortableListResult<T, F extends string> {
  /** Items after search + sort applied. */
  rows: T[];
  /** Current free-text query (empty string when unset). */
  search: string;
  setSearch: (value: string) => void;
  /** Currently active sort field, or null for no sort. */
  sortField: F | null;
  sortDir: SortDir;
  /** Toggle: same field flips direction; new field resets to asc. */
  handleSort: (field: F) => void;
}

export function useSortableList<T, F extends string>({
  items,
  searchPredicate,
  sortBy,
  initialSortField = null,
  initialSortDir = "asc",
}: UseSortableListOptions<T, F>): UseSortableListResult<T, F> {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<F | null>(initialSortField);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);

  const rows = useMemo(() => {
    let result: T[] = search
      ? items.filter((it) => searchPredicate(it, search))
      : [...items];

    if (sortField) {
      const extract = sortBy[sortField];
      result = result.slice().sort((a, b) => compare(extract(a), extract(b), sortDir));
    }

    return result;
  }, [items, search, sortField, sortDir, searchPredicate, sortBy]);

  function handleSort(field: F) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return { rows, search, setSearch, sortField, sortDir, handleSort };
}

// Nulls always sort to the end, regardless of direction.
function compare(a: SortKey, b: SortKey, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  let cmp: number;
  if (typeof a === "string" && typeof b === "string") {
    cmp = a.localeCompare(b);
  } else if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    // Mixed string/number — coerce to string. Shouldn't happen with typed
    // extractors but guards against NaN-producing silent failures.
    cmp = String(a).localeCompare(String(b));
  }
  return dir === "asc" ? cmp : -cmp;
}
