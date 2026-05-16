# BUILD_STATUS.md

> Last updated: 2026-05-15

## Build Summary

| Metric | Value |
|--------|-------|
| Components built | 36 / 36 |
| RTL test files | 45 (incl. 4 integration) |
| RTL tests passing | 380 / 380 |
| Integration test files | 4 (upload-flow, add-bean-flow, roast-detail-flow, bean-detail-flow) |
| Server test files | 13 |
| Server tests passing | 183 / 183 |
| E2E test files | 10 |
| Schema validation | 33 / 33 operations pass |
| Flavor descriptors | 121 (SCA 2016 + 20 specialty additions) |
| Open PRs | #88 (chore/expand-flavor-seed) |

## Recent architecture passes — three audits shipped (PRs #81–#87)

Third `/improve-codebase-architecture` audit run 2026-05-15, all six
candidates merged:

| PR | Refactor |
|---|---|
| #81 | `useSortableList` — search+sort seam, 2 callers |
| #82 | `UploadModal` callbacks — 4 props → 3 with discriminated `onComplete` |
| #83 | `useFlavorParser` — supplier-notes parse widget, 2 callers |
| #84 | `requireUserBeanByBeanId` — server guard helper, 3 callers + closed NOT_FOUND coverage gap |
| #85 | Deleted zombie `MetricsTable` (0 production callers) |
| #86 | `useFlavorDescriptors` — flavor catalogue seam, 5 callers + killed BeanCard's parallel query |
| #87 | `ROAST_PREVIEW_FIELDS` fragment + deleted dead `PREVIEW_ROAST_LOG` |

Domain glossary at `docs/CONTEXT.md` now defines: Roast preview,
Flavor descriptor catalogue, Flavor parse widget, Sortable list.

## Wave Completion

| Wave | Status | Components | Tests |
|------|--------|-----------|-------|
| 0 — Foundation | Done | Styles, GraphQL, lib utilities | Unit tests for formatters, tempConversion |
| 1 — Shared primitives | Done | Modal, StarRating, FlavorPill, Combobox, Toast, Pagination, EmptyState, ErrorState, SkeletonLoader, MetricsTable, StatChips, TempToggle, ThemeToggle, RoastChart | 116 |
| 2 — Composed components | Done | ConfirmDialog, ErrorBoundary, BeanCard, UserButton, RoastsTable, FlavorPickerModal, AddBeanModal | 64 |
| 3 — UploadModal | Done | UploadModal | 11 |
| 4 — Providers & Shell | Done | ApolloProvider, E2eApolloProvider, ThemeContext, TempContext, AppProviders, ProtectedRoute, Header, AppLayout | 18 |
| 5 — Pages | Done | LandingPage, DashboardPage, BeanLibraryPage, BeanDetailPage, RoastDetailPage, ComparePage, SignInPage, SignUpPage, NotFoundPage | 56 |
| 6 — App entry & routing | Done | App.tsx, main.tsx | — |

## Server Changes

| Change | Status |
|--------|--------|
| Rename `isShared` → `isPublic` (default true) | Done |
| Remove `shareToken` field | Done |
| Add `theme`, `privateByDefault` to User | Done |
| Public queries: `communityStats`, `publicBeans`, `publicRoasts`, `bean`, `roast` | Done |
| `flavorDescriptors` made public (no auth) | Done |
| `toggleRoastPublic` mutation (replaces `toggleRoastSharing`) | Done |
| `updateTheme`, `updatePrivacyDefault` mutations | Done |
| `uploadRoastLog` respects `privateByDefault` setting | Done |
| Prisma migration applied | Done |
| Server tests updated and passing (129/129) | Done |

## Design Audit — COMPLETE

All Critical and Major issues fixed. See `/docs/DESIGN_AUDIT.md`.

| Category | Found | Fixed |
|----------|-------|-------|
| Critical (a11y) | 5 | 5 |
| Major (a11y) | 4 | 4 |
| Minor (a11y) | 7 | 0 (flagged) |
| Axe-core violations | 0 across all routes | — |

Fixes applied:
- Color contrast: sign-in link, chart toggle buttons, empty state text
- ARIA: StarRating role="img", chart aria-label
- Accessibility: prefers-reduced-motion global rule
- Focus: textarea outline, sign-in link focus-visible
- Active states: toggle buttons across 3 files
- Layout: removed duplicate header from LandingPage
- Alignment: nav link vertical alignment with logo

## Visual QA — COMPLETE

All Critical, Major, and Minor UX issues fixed. See `/docs/VISUAL_QA.md`.

| Category | Found | Fixed |
|----------|-------|-------|
| Critical (UX) | 3 | 3 |
| Major (UX) | 4 | 4 |
| Minor (UX) | 9 | 8 (m9 skipped — feature request) |

Fixes applied:
- Silent file rejection → error message for non-.klog files
- Mutation pending states → isMutating disables buttons, toast errors
- Delete failure → toast error on catch
- Touch targets → min-height: var(--control-min-height) across all controls
- File parse loading → "Parsing..." indicator
- Parse warnings → structured list
- Domain tooltips → FC, DTR, Dev Time, Dry End in MetricsTable
- Public/Private toggle → lock icons, aria-label, toast confirmation
- Sort indicators → ↕ on unsorted columns
- Back links → underline + proper touch targets
- Parse button → "Parse Flavors" + no-match feedback

## Visual Baseline — SET

Screenshots promoted as baseline for 4 routes × 4 breakpoints (16 total):
landing, bean-library, bean-detail, roast-detail

## Code Review — COMPLETE

code-reviewer and code-simplifier ran in parallel. Fixes applied:
- Race condition: toast message in handleTogglePublic (captured state before await)
- Dead code: removed unused activeTextColor, tempSymbol
- Token consolidation: --control-min-height token, --color-text-inverse-hover/active
- Color dedup: DATASET_COLOR lookup + colorWithAlpha helper in RoastChart
- Error handling: handleDownloadProfile converted to async/await with toast
- Simplification: Math.max(0, 0 - PHASE_PADDING) → 0
- Parsing state: added setParsing(false) to reset()

## E2E Test Files

| File | Flows | Status |
|------|-------|--------|
| `landing.spec.ts` | Landing page, public browsing | Passing (pre-audit) |
| `auth.spec.ts` | Public/protected route boundaries | Passing |
| `dashboard.spec.ts` | Stats, table, search/filter, compare, empty state | Passing |
| `upload.spec.ts` | Upload modal, file preview, bean matching, file validation, parsing indicator, parse warnings | Passing |
| `roast-detail.spec.ts` | Public view, owner editing, delete, chart, toast feedback, tooltips (FC/DTR/Dev/Dry End), lock icon + aria-label | Passing |
| `bean-library.spec.ts` | Card/table toggle, auth variants, add bean, sort indicators, parse no-match feedback | Passing |
| `bean-detail.spec.ts` | Public view, owner editing, cupping notes | Passing |
| `compare.spec.ts` | From dashboard, from roast detail, cross-bean | Passing |
| `header-controls.spec.ts` | Temp toggle, theme toggle, privacy default | Passing |
| `journeys.spec.ts` | 6 cross-page journey flows | Passing |

## Frontend Orchestration Plugin Updates

- `standards/ux-quality.md` — NEW: Nielsen's heuristics, Gestalt principles, interaction quality, frustration signals
- `commands/visual-qa.md` — NEW: UX quality review command
- `subagents/visual-qa-reviewer.md` — NEW: visual QA reviewer subagent
- `commands/design-audit.md` — UPDATED: Phase 2 visual composition review, Phase 3 re-review
- `subagents/screenshot-reviewer.md` — UPDATED: page-level composition analysis
- `standards/design-and-a11y.md` — UPDATED: Visual Composition checklist section

## Bug Fix

- **ToastProvider missing from AppProviders** — `useToast()` threw at runtime because `ToastProvider` was never added to the app's provider tree. All unit tests passed (each test wrapped components individually), but E2E tests exposed the gap. Fixed by adding `ToastProvider` inside `ThemeProvider` in `AppProviders.tsx`.

## Testing Overhaul

Replaced hand-written GraphQL mocks with schema-driven MSW.
All mock operations now execute against the real server `typeDefs` —
schema mismatches fail at test time.

| Change | Details |
|--------|---------|
| Old `handlers.ts` | Deleted — hand-written JSON with drifted shapes |
| New `schema-handler.ts` | Imports server `typeDefs`, validates operations |
| Integration tests | 2 new files (upload-flow, add-bean-flow) — 14 tests |
| Testing convention | `userEvent.type()` always, `fireEvent.change` never |

## Bugs Fixed

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 2 | "Add new bean" not a CTA | Text-styled link | Styled CTA button |
| 3 | Parse Flavors broken | `flavors` prop not passed through UploadModal flow | Chain FLAVOR_DESCRIPTORS_QUERY through AppLayout → UploadModal → AddBeanModal |
| 4 | No supplier description field | Missing from form | Added `supplierDescription` field mapping to `bagNotes` |
| 5 | Supplier field doesn't save | Not in GQL schema | Added `supplier` to Bean model + CreateBeanInput |
| 6 | Save does nothing (GQL error) | `supplier` not in `CreateBeanInput` | Server schema fix (Task 3) |
| 7 | Notes loses focus | Modal `requestAnimationFrame` steals focus on re-render | `hasFocusedRef` — only focus on initial open |
| 8 | Save disabled incorrectly | No feedback on why | Helper text: "Select or create a bean to save" |
| 9 | Bean selection UX unclear | Banner-only display | Structured bean section with match display + CTA |

## Known Issues

- E2E tests mutate data — reseed (`npm run db:seed`) before each full E2E run
- (Dark mode tokens shipped in PR #74; "other roasts" flake fixed in PR #73)

## Completed Post-Merge

- **PR #35** — full frontend rebuild (34 components, 9 pages, server public access model)
- **PR #36** — orchestrator config + design docs
- **PR #37** — `?upload=true` search param wired to open upload modal
- **PR #38** — chart iteration: marker collision stagger + grid interval controls
- **PR #39** — auth page error boundary
- **PR #40** — testing overhaul: schema-driven mocks, integration tests, 8 bug fixes, USER_STORIES.md

## Orchestrator

DAG runner lives at https://github.com/Jakemo136/frontend-orchestrator
Plugin location: `.claude/plugins/frontend-orchestration/runner/`
Config: `orchestrator.config.yaml` (project root)

Recent additions:
- `user-story-generation` step (produces USER_STORIES.md with Data flow annotations)
- Wiring audit enforcement in `build-wave`, `post-wave-review`
- Testing conventions: schema-driven MSW, userEvent, button state machines, dead-end detection

## Design Specs & Plans

| Doc | Path |
|-----|------|
| UI Requirements | `docs/UI_REQUIREMENTS.md` |
| Component Inventory | `docs/COMPONENT_INVENTORY.md` |
| User Stories | `docs/USER_STORIES.md` (with Data flow annotations) |
| Orchestrator DAG Runner Design | `docs/superpowers/specs/2026-04-06-frontend-orchestrator-dag-runner-design.md` |
| Testing Strategy & Wiring Audit | `docs/superpowers/specs/2026-04-06-testing-strategy-and-user-stories-design.md` |
| Orchestrator Implementation Plan | `docs/superpowers/plans/2026-04-06-frontend-orchestrator-dag-runner.md` |
| Testing Overhaul Plan | `docs/superpowers/plans/2026-04-06-testing-overhaul-and-bug-fixes.md` |

## Integration Tests & CI Schema Validation (PR #41)

| File | Stories | Tests | Status |
|------|---------|-------|--------|
| `upload-flow.integration.test.tsx` | US-UP-1, UP-2, UP-4, UP-5, UP-6 | 8 | Passing |
| `add-bean-flow.integration.test.tsx` | US-AB-1, AB-2, AB-3 | 7 | Passing |
| `roast-detail-flow.integration.test.tsx` | US-RD-1, RD-2, RD-3, RD-4 | 7 | Passing |
| `bean-detail-flow.integration.test.tsx` | Bean editing, cupping notes, roast history | 6 | Passing |

**CI schema validation:** `npm run validate:schema` validates all 31 client GraphQL operations against server typeDefs using `graphql`'s `validate()`. Added as CI step before `npm run build`.

**Infrastructure fix:** Resolved dual-realm `graphql` module issue (ESM vs CJS) via Vitest `resolve.alias` — MSW schema-handler was silently 500ing on all real HTTP requests.

**CI fix:** Removed `continue-on-error: true` from server job — server test failures now block CI.

## Supplier Combobox (PR #42)

- Server: `distinctSuppliers` public query — returns unique non-null supplier strings, sorted alphabetically
- Client: AddBeanModal supplier field → `<Combobox allowCustom>` with community suppliers
- Wired through AppLayout → UploadModal → AddBeanModal and BeanLibraryPage → AddBeanModal
- `cache-first` fetch policy — one network request per session
- `createBean` mutation refetches supplier cache so new suppliers appear immediately
- Schema validation: 32/32 operations pass
- Server tests: 130/130 pass

## Multi-Roast Upload (PR #43)

- New `BatchUploadTable` component — table with inline bean Comboboxes per row
- UploadModal: single file → existing flow, 2+ files → batch mode with auto-match
- Sequential saves with "Saving N of M…" progress indicator
- Non-.klog files filtered with warning, max 20 files
- `onBatchComplete` callback navigates to dashboard after batch save
- 16 new tests (11 unit + 5 integration)

## Batch Upload UX + Roast Detail Rework (PR #44 — OPEN)

Extensive live-testing cycle surfaced 15+ bugs and UX issues.
All fixed on the branch but CI was last red (pre-dates fixes) —
needs re-run before merge.

**Batch upload fixes:**
- `previewRoastLogs` server query added — batch parse in one request
  (fixed `useLazyQuery` abort issue where only last file parsed)
- Batch mode uses single bean for all roasts (radio group: matched / select / add new)
- `uploadRoastLog` gets `refetchQueries: [MY_ROASTS_QUERY]` — Dashboard updates
- Split `handleSave`/`handleUploadRoast` — batch saves skip per-roast navigation
- Wider modal (720px), Bean column in table, "Selected: X" confirmation
- Review fixes: index-based save tracking (dup filenames), FileReader onerror,
  reset() before unmount, handleCreateBean batch-mode gap

**Compare flow rework — unified table:**
- Compare no longer uses a separate page — overlays on the roast detail chart
- Single `RoastMetricsTable` replaces the old metrics table + "other roasts" section
- Current roast highlighted, other bean roasts as rows with checkboxes to overlay
- Row click → navigate to that roast's detail
- `roastsByIds` no longer strips `timeSeriesData` (was LIST_QUERY_OMIT)
- Chart fixes: independent Y axes for RoR/Fan/Power (were colliding on one axis),
  tooltip `mode: nearest` when comparing, chart height 600px, phase zoom preserved
- `MetricsTable` and `ComparePage` components now unused (candidates for removal)

**Other fixes:**
- AddBeanModal: added `shortName` field (required for bean matching on upload)
- BeanCard: nudge banner for incomplete bean details
- Modal base class: restored flex layout (had regressed, pushed Save buttons off-screen)
- RoastsTable: larger checkbox click targets via label wrapper
- E2E compare.spec.ts: fixed ambiguous `text=/rating/i` selector

## Server-Side Flavor Parsing (SCA Flavor Wheel)

- **101 flavor descriptors** seeded from SCA 2016 flavor wheel JSON (`mocks/coffee_flavors.json`)
- `FlavorCategory` enum updated to match SCA Tier 1: FRUITY, SOUR_FERMENTED, GREEN_VEGETATIVE, OTHER, ROASTED, SPICES, NUTTY_COCOA, SWEET, FLORAL, OFF_FLAVOR
- Per-descriptor colors from the actual SCA wheel (replaces one-color-per-category)
- `FlavorService.parseSupplierNotes(text)` — Porter stemming via `stemmer` package, 4-strategy matching (substring → word → stem → de-plural)
- `parseSupplierNotes` GraphQL query (public, no auth)
- Client: "Parse Flavors" button triggers server query, new "Add a flavor..." Combobox for manual selection from cached descriptors
- ScrapingService unified — `KNOWN_FLAVORS` removed, delegates to FlavorService
- Client-side `flavorParser.ts` removed (replaced by server)
- Server tests: 146/146 | Client tests: 309/309 | Schema: 35/35

## Additional UX Fixes (PR #44 continued)

- "Profile Temp" → "Profile Target" with chart caption explaining setpoint vs measured temp
- "Cupping Notes" → "Supplier Notes" across all UI labels
- BeanCard per-card nudge removed (unnecessary)
- Bean Name column hidden on BeanDetailPage roast history table
- Star rating moved to roast detail header (highly visible, interactive for owners)
- Delete bean from BeanDetailPage with confirmation dialog
- `REMOVE_BEAN_MUTATION` wired to client

## Next Steps

1. **Clean up orphaned code** — `MetricsTable.tsx`, `ComparePage.tsx` and the
   `/compare` route are no longer wired in. Remove after PR #44 merges.
2. **Dark mode** — define `[data-theme="dark"]` token set in `tokens.css`, adapt chart colors
3. **Expand seed descriptors** — add missing SM-common terms (Bergamot, Tangerine, etc.) not in SCA wheel
