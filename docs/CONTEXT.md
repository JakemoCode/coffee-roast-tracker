# Project context — domain vocabulary

Terms in this file are the project's load-bearing concepts. Modules and tests
should use these names exactly. New concepts get added here as they emerge from
architecture grilling sessions (`/improve-codebase-architecture`).

## Domain concepts

(none yet — this file was lazy-created during the `useSortableList` grill.
Add domain terms here as they crystallise.)

## Client architecture concepts

### Flavor parse widget

A user-driven flow where free-text supplier or cupping notes are sent to
the server for fuzzy matching against the flavor descriptor catalogue,
and the matched flavors (plus any the user adds manually) are collected
into a pill list ready to be saved.

Owned by the **`useFlavorParser`** hook at `client/src/lib/useFlavorParser.ts`.

- **Scope**: parse state (text + matched list) + manual additions + an
  `availableOptions` view that excludes already-picked items. Pure state
  — no save dispatch, no rendering.
- **Already-selected exclusion**: caller-supplied via `alreadySelected`.
  Used when editing a bean that already has saved suggested flavors so
  the combobox doesn't offer duplicates.
- **"No match" UX**: caller-owned. The hook exposes `parseAttempted`
  and the caller decides whether to render a fallback message.
- **Save**: out of scope. Callers wire their own `onSave` /
  `useMutation` and call `reset()` afterward. The two adapters differ
  here (modal bundles into a parent save; detail page fires its own
  mutation), and the hook stays out of that decision.
- **Color resolution**: out of scope. Pill colors come from the
  flavor descriptor catalogue, which has its own seam.

Adapters today:

- `client/src/components/modals/AddBeanModal/AddBeanModal.tsx` —
  collects flavors as part of bean creation; save bundled into modal
  `onSave`.
- `client/src/pages/BeanDetail/BeanDetailPage.tsx` — appends to a
  bean's existing suggested flavors; saves via
  `UPDATE_BEAN_SUGGESTED_FLAVORS` mutation.

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
