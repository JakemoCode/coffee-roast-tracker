# Project context — domain vocabulary

Terms in this file are the project's load-bearing concepts. Modules and tests
should use these names exactly. New concepts get added here as they emerge from
architecture grilling sessions (`/improve-codebase-architecture`).

## Domain concepts

(none yet — this file was lazy-created during the `useSortableList` grill.
Add domain terms here as they crystallise.)

## Client architecture concepts

### Sortable list

A client-side view of a fixed-size collection where the user can:

- Type a free-text query that filters items (semantics chosen by the caller)
- Click a column to set its sort field; clicking the same field again toggles
  asc/desc
- See items rendered in the resulting order

Owned by the **`useSortableList`** hook at `client/src/lib/useSortableList.ts`.

- **Scope**: search + sort only. No pagination, no selection, no server
  round-trips. The hook is pure client state + computed views.
- **Search predicate**: caller-supplied; the hook does not assume which
  fields a query touches.
- **Sort comparators**: caller-supplied per field (a `sortBy` map). Nulls
  always sort to the end regardless of direction.
- **Sort indicator glyph**: caller-owned. The hook returns `{ sortField,
  sortDir }` and lets each call site decide how to render the cue (RoastsTable
  shows nothing for inactive columns; BeanLibraryPage shows `↕`).
- **Side effects on change** (e.g. resetting pagination): out of scope.
  Callers wrap with `useEffect` if they need to react.

Adapters today:

- `client/src/components/tables/RoastsTable/RoastsTable.tsx` — sort over 6
  roast columns; search over `bean.name`.
- `client/src/pages/BeanLibrary/BeanLibraryPage.tsx` — sort over 6 bean
  columns; search over `name | origin | process`.
