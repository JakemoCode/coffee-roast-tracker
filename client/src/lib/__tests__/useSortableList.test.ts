import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSortableList } from "../useSortableList";

interface Bean {
  id: string;
  name: string;
  origin: string | null;
  score: number | null;
}

const beans: Bean[] = [
  { id: "a", name: "Ethiopia Yirgacheffe", origin: "Ethiopia", score: 88 },
  { id: "b", name: "Colombia Huila", origin: "Colombia", score: null },
  { id: "c", name: "Kenya Nyeri", origin: "Kenya", score: 90 },
];

type SortField = "name" | "score";

function render() {
  return renderHook(() =>
    useSortableList<Bean, SortField>({
      items: beans,
      searchPredicate: (b, q) => b.name.toLowerCase().includes(q.toLowerCase()),
      sortBy: {
        name: (b) => b.name,
        score: (b) => b.score,
      },
    }),
  );
}

describe("useSortableList", () => {
  it("returns the full list when no search and no sort field", () => {
    const { result } = render();
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(result.current.search).toBe("");
    expect(result.current.sortField).toBeNull();
  });

  it("filters rows by the search predicate when search is set", () => {
    const { result } = render();
    act(() => result.current.setSearch("yirg"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("sorts rows ascending when handleSort is called for the first time", () => {
    const { result } = render();
    act(() => result.current.handleSort("name"));
    expect(result.current.sortField).toBe("name");
    expect(result.current.sortDir).toBe("asc");
    expect(result.current.rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("toggles to descending when the same field is clicked twice", () => {
    const { result } = render();
    act(() => result.current.handleSort("name"));
    act(() => result.current.handleSort("name"));
    expect(result.current.sortDir).toBe("desc");
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("resets to ascending when switching to a different field", () => {
    const { result } = render();
    act(() => result.current.handleSort("name"));
    act(() => result.current.handleSort("name")); // desc
    act(() => result.current.handleSort("score"));
    expect(result.current.sortField).toBe("score");
    expect(result.current.sortDir).toBe("asc");
  });

  it("sorts nulls to the end regardless of direction", () => {
    const { result } = render();
    act(() => result.current.handleSort("score")); // asc: 88, 90, null
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "c", "b"]);
    act(() => result.current.handleSort("score")); // desc: 90, 88, null
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("applies search and sort together", () => {
    const { result } = render();
    act(() => result.current.handleSort("name"));
    act(() => result.current.setSearch("o")); // matches Ethiopia + Colombia
    expect(result.current.rows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("respects initialSortField + initialSortDir on first render", () => {
    const { result } = renderHook(() =>
      useSortableList<Bean, SortField>({
        items: beans,
        searchPredicate: (b, q) => b.name.toLowerCase().includes(q.toLowerCase()),
        sortBy: { name: (b) => b.name, score: (b) => b.score },
        initialSortField: "score",
        initialSortDir: "desc",
      }),
    );
    expect(result.current.sortField).toBe("score");
    expect(result.current.sortDir).toBe("desc");
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});
