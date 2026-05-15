# Project context — domain vocabulary

Terms in this file are the project's load-bearing concepts. Modules and tests
should use these names exactly. New concepts get added here as they emerge from
architecture grilling sessions (`/improve-codebase-architecture`).

## Domain concepts

### Roast preview

The parsed-but-not-saved view of a `.klog` file. The user uploads a
file, the server parses it and returns the extracted metadata plus
bean-matching hints (library matches + community matches), and the
user reviews + commits or cancels before any roast row is created.

Owned by the **`ROAST_PREVIEW_FIELDS`** fragment at
`client/src/components/modals/UploadModal/RoastPreviewFragment.ts`.
The TypeScript shape derives via `FragmentOf<typeof ROAST_PREVIEW_FIELDS>`
— callers should never hand-roll the preview interface.

The fragment lives in its own tiny file (rather than colocated in
`UploadModal.tsx`) to avoid a circular import: `operations.ts` needs
the fragment for `PREVIEW_ROAST_LOGS`, but `UploadModal.tsx` imports
`PUBLIC_BEANS_QUERY` from `operations.ts`. A neutral fragment file
breaks the cycle and matches the `FlavorPickerModal` pattern.

Server type: `RoastLogPreview` (note: the GraphQL type name keeps the
`Log` because the schema talks about roast LOG files; the client uses
`RoastPreview` colloquially because that's the user-facing concept).

Fields include parse metadata (roastDate, totalDuration, profile info,
crack times), bean-matching results (`suggestedBeans` library hits +
`communityBeans` catalogue hits), parse warnings, and an
`existingRoastId` for duplicate detection.

Adapters today:

- `client/src/graphql/operations.ts` — `PREVIEW_ROAST_LOGS` query
  spreads the fragment to fetch previews in batch.
- `client/src/components/modals/UploadModal/UploadModal.tsx` —
  consumes via `FragmentOf` for its `RoastPreview` type.

## Client architecture concepts

### Flavor descriptor catalogue

The set of named flavors the app knows about (Jasmine, Blueberry, Dark
Chocolate, ...), each with a category and a display color. Seeded from
the SCA 2016 flavor wheel plus any user-added custom descriptors.
Used everywhere flavors are rendered, filtered, or matched.

Owned by the **`useFlavorDescriptors`** hook at
`client/src/lib/useFlavorDescriptors.ts`.

- **Scope**: fetch the catalogue once per render tree, expose both
  iteration shape (`descriptors`) and lookup shape (`colorMap`).
- **Off-flavors**: the catalogue separates regular flavors and off-flavors
  (defects). Most callers want both; `RoastDetailPage` wants them split
  so it can render two separate pickers. Hook takes an optional
  `isOffFlavor?: boolean` to filter.
- **Network shape**: callers should NEVER issue `FLAVOR_DESCRIPTORS_QUERY`
  directly. The hook is the single seam; Apollo's cache deduplicates
  parallel callers under it.

Adapters today:

- `client/src/components/layout/AppLayout/AppLayout.tsx` — passes
  descriptors to UploadModal/AddBeanModal for the flavor-parse widget.
- `client/src/pages/BeanDetail/BeanDetailPage.tsx` — feeds `useFlavorParser`.
- `client/src/pages/BeanLibrary/BeanLibraryPage.tsx` — filter UI.
- `client/src/pages/RoastDetail/RoastDetailPage.tsx` — calls twice with
  `isOffFlavor: false` / `true` for the picker modals.
- `client/src/components/BeanCard/BeanCard.tsx` — color lookup only.

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
