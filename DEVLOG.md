# DEVLOG

## 2026-03-24 — Initial scaffold

### Summary
Scaffolded the full monorepo structure for Coffee Roast Tracker: a web app for tracking, analyzing, and sharing home coffee roasts with Kaffelogic integration.

### Stack decisions

**React 19 + TypeScript + Vite (frontend):** React 19 is stable with the React Compiler, Server Components, and new hooks (`use`, `useActionState`, `useOptimistic`). Vite is the standard build tool for new React projects — fast HMR, minimal config. No UI built yet; shell only.

**Apollo Server 4 + Apollo Client 4 (GraphQL):** Apollo Client 4 shipped Sept 2025 with smaller bundles, ESM-first packaging, `useSuspenseQuery`, `useFragment`, and the new `dataState` property. Using Apollo over REST because roast comparison queries benefit from GraphQL's flexible field selection — clients can request exactly the phase data they need for comparison views without over-fetching.

**Prisma (ORM):** Type-safe database access with schema-as-source-of-truth. Migrations, seeding, and Prisma Studio for development. Generates TypeScript types from the schema automatically.

**Clerk (auth):** Managed auth with JWT validation. No password storage, no session management code. Clerk handles signup/login flows; we validate JWTs in Apollo context and resolve to a local userId via upsert.

**Cloudflare R2 (file storage):** S3-compatible object storage for `.klog`, `.csv`, and `.kpro` files. Presigned URLs for downloads — files never pass through our server on read. Cost-effective for the expected volume of roast files.

**PostgreSQL on Heroku + Vercel (deploy target):** Heroku for the API + managed Postgres. Vercel for the Vite frontend with edge deployment. Standard split for this kind of app.

### Data model notes

- Every model with user data is scoped by `userId` — all queries enforce ownership
- `Roast.shareToken` is a UUID generated on creation (Prisma `@default(uuid())`), enabling share-by-link without exposing internal IDs
- Phase data fields (`dryingEndTime`, `maillardEndTime`, `firstCrackTime`, `firstCrackTemp`, `developmentTime`, `developmentDeltaTemp`, `roastEndTemp`, `totalDuration`) are nullable floats — not every import format provides all fields
- All temperatures stored in Celsius (Kaffelogic native format); Fahrenheit display is a UI conversion only, never stored
- User `tempUnit` preference (CELSIUS/FAHRENHEIT) controls display only — no temp values are ever persisted in Fahrenheit
- DTR% is not stored; it's derived client-side from `developmentTime / totalDuration`
- `RoastProfile` is one-to-one with `Roast` — upsert on upload replaces any existing profile

### Intentional scope limits (v1)

- **EspressoShot:** Model is scaffolded in Prisma but has no GraphQL resolvers. Will add in a future version when the shot tracking UI is designed.
- **RoastProfile types:** Only `KAFFELOGIC` is active. Enum stubs for ARTISAN, BULLET, KALEIDO, and ROEST are commented in both Prisma and GraphQL schemas for future expansion.
- **`.kpro` file diffing is an explicit non-goal for v1.** Profile comparison means comparing parsed phase data (DTR%, development time, total duration, phase timestamps) across roasts of the same bean — not diffing the raw `.kpro` files themselves.

### Seed data
3 users (Alice, Bob, Carol), 8 beans across different origins and processes, 24 roasts with realistic phase data showing progression (dialing in lighter/darker, noting improvements between roasts). Several roasts have `isShared: true` for testing the public share flow.

---

## 2026-03-25 — Make Bean user-agnostic

### Summary
Refactored `Bean` from a user-owned entity to a shared catalog entity. A bean like "Yirgacheffe Kochere" is a real-world coffee — it shouldn't be locked to a single user. Introduced a `UserBean` join table so users maintain personal bean libraries with their own notes.

### Schema changes
- **Bean:** Removed `userId` and `notes` fields, added `cropYear Int?` for distinguishing harvests
- **UserBean (new):** Join table with `userId`, `beanId`, `notes`, and a `@@unique([userId, beanId])` constraint
- **User:** `beans Bean[]` → `userBeans UserBean[]`

### GraphQL changes
- `myBeans` query now returns `[UserBean!]!` (includes per-user notes alongside bean data)
- `createBean` mutation creates the Bean and auto-adds it to the caller's library (returns `UserBean`)
- New mutations: `addBeanToLibrary`, `updateUserBean`, `removeBeanFromLibrary`
- `createRoast` no longer validates bean ownership — any user can roast any bean, the roast itself is user-scoped

### Seed data updated
- Beans are created without userId; `cropYear` added to most beans
- UserBean records link users to their beans with personal tasting notes
- Bob now also has Ethiopia Yirgacheffe in his library (shared bean, different notes)
- 3 users, 8 beans, 11 user-bean links, 24 roasts

### Prisma 7 notes
- `prisma.config.ts` lives at `server/` root (not inside `prisma/`) — Prisma 7 expects it there
- `datasource.url` is configured in `prisma.config.ts`, not in `schema.prisma` (removed in Prisma 7)
- Seed command configured via `migrations.seed` in `prisma.config.ts` (replaces `package.json` `prisma.seed`)
- `PrismaClient` requires `@prisma/adapter-pg` with `{ connectionString }` — no more `datasourceUrl` constructor option

---

## 2026-03-25 — Update Roast fields from .klog analysis

### Summary
Revised the Roast data model based on analysis of an actual Kaffelogic `.klog` file. Several original fields didn't map to real `.klog` event markers; replaced them with fields that directly correspond to the file format.

### Fields removed
- **`dryingEndTime`**: No discrete event marker exists in `.klog` format — drying phase end isn't logged as a timestamped event
- **`maillardEndTime`**: Incorrect terminology. Kaffelogic uses `!colour_change` as the event marker, not "Maillard end"
- **`developmentDeltaTemp`**: Not logged in `.klog` files. Derivable client-side as `roastEndTemp - firstCrackTemp` if needed

### Fields added (Roast)
- **`ambientTemp`** (Float?): From `ambient_temperature` header — ambient °C at time of roast
- **`roastingLevel`** (Float?): KL roasting level from header metadata, e.g. 4.3
- **`tastingNotes`** (String?): From `tasting_notes` header — distinct from user `notes` (which are post-roast journal entries)
- **`colourChangeTime`** (Float?): Seconds, from `!colour_change` event marker
- **`colourChangeTemp`** (Float?): °C at the `!colour_change` timestamp (looked up from time-series)
- **`roastEndTime`** (Float?): Seconds, from `!roast_end` event marker
- **`developmentPercent`** (Float?): Logged directly in `.klog` as `!development_percent` (e.g. 13.7606). More reliable than calculating DTR% client-side from `developmentTime / totalDuration`
- **`timeSeriesData`** (Json?): Full parsed time-series rows for chart rendering — `[{time, spotTemp, temp, meanTemp, profileTemp, profileROR, actualROR, desiredROR, powerKW, actualFanRPM}]`. Stored as a single JSON blob; consumed whole for charting, never queried row-by-row
- **`roastProfileCurve`** (Json?): Decoded `roast_profile` header — `[{time, temp}]` target curve
- **`fanProfileCurve`** (Json?): Decoded `fan_profile` header — `[{time, rpm}]` target curve

### Fields added (RoastProfile)
- **`profileShortName`** (String?): From `profile_short_name` header, e.g. "EGB"
- **`profileDesigner`** (String?): From `profile_designer` header, e.g. "jakemo"

### Performance note
`timeSeriesData`, `roastProfileCurve`, and `fanProfileCurve` are excluded from list query resolvers (`myRoasts`, `roastsByBean`, `roastsByIds`) via Prisma `omit`. Only single-roast queries (`roastById`, `roastByShareToken`) return the full chart data.

### GraphQL changes
- `JSON` scalar added for time-series and curve fields
- `CreateRoastInput` / `UpdateRoastInput` updated to match new field set
- `RoastProfile` type gains `profileShortName` and `profileDesigner`

### What informed these decisions
All field naming and sourcing decisions came from analyzing an actual `.klog` file exported from a Kaffelogic Nano 7e. The `.klog` format uses `!`-prefixed inline rows for event markers and header key-value pairs for metadata — this is the authoritative source for what data is available

---

## 2026-03-25 — Remove premature multi-roaster abstraction

### Summary
Removed commented-out enum stubs (ARTISAN, BULLET, KALEIDO, ROEST) from the `ProfileType` enum in both Prisma and GraphQL schemas. The data model is built directly on `.klog` structure and makes Kaffelogic-specific assumptions throughout — field names, event markers, curve encoding, and header metadata all map 1:1 to the `.klog` format. I realized I have no idea how roast logs are structured when coming from other roaster ecosystems and therefore could not reasonably, at this time, expect to support other file types.

### Rationale
- Supporting other roaster log formats (Artisan, Bullet, Kaleido, Roest) would require a separate design effort and likely a different or extended data model — not a simple enum addition
- Commented-out enum values overpromised future compatibility and implied the current schema could handle arbitrary formats
- `ProfileType` enum retained as a single-value enum (`KAFFELOGIC`) to preserve the extension point without overpromising

---

## 2026-03-25 — Implement .klog parser and upload mutation

### Summary
Added server-side `.klog` file parsing and validation as pure functions, plus an `uploadRoastLog` GraphQL mutation that validates, parses, stores the raw file to R2, and creates Roast + RoastFile records in a single operation.

### Design decisions

**Parser as pure function:** `parseKlog(fileContent: string)` has no DB or R2 dependencies — it takes a string and returns structured data. This makes it trivially testable and reusable outside the GraphQL layer.

**Discard post-roast data:** All time-series rows after `!roast_end` are discarded during parsing. Cooldown data is not useful for roast analysis. `totalDuration` equals `roastEndTime`, not the final timestamp in the raw file.

**Partial failure strategy:** If time-series data, roast profile curve, or fan profile curve fail to parse, the field is set to `null` and a descriptive message is pushed to `parseWarnings`. Scalar fields (event markers, header metadata) are always extracted if possible. The parser only throws if the file has no recognizable headers AND no time-series data — i.e., it's not a `.klog` file at all.

**parseWarnings surfaced to client:** `UploadRoastResult` returns both the created `Roast` and a `parseWarnings: [String!]!` array. The client can display these as non-blocking warnings ("Profile curve could not be parsed") without failing the upload.

**Duplicate detection:** The resolver checks for an existing roast with the same `fileName` + `userId`. If found, it returns a descriptive error rather than silently replacing. The client is responsible for confirmation UX ("A roast log with this filename already exists. Do you want to replace it?") — the server does not auto-replace.

**File content as string (not Upload scalar):** Apollo Server standalone mode doesn't support the `Upload` scalar (requires graphql-upload + Express middleware). The mutation accepts `fileName: String!` and `fileContent: String!` — the client reads the file and sends content directly. `.klog` files are plain text and small (typically <100KB), so this is practical.

### Test fixtures
Real `.klog` files in `/mocks/sample-roasts/` (exported from a Kaffelogic Nano 7e) are used as the primary test fixtures. Parser tests assert against actual values from these files — not synthetic data — ensuring the parser handles real-world format variations.

### Files added
- `server/src/lib/klogParser.ts` — Pure parser: headers, time-series, event markers, curve decoding
- `server/src/lib/validateKlog.ts` — Pre-parse validation (extension, header presence, time-series header)
- `server/src/lib/klogParser.test.ts` — Parser tests against real .klog fixtures
- `server/src/lib/validateKlog.test.ts` — Validation tests

### Files modified
- `server/src/schema/typeDefs.ts` — Added `UploadRoastResult` type and `uploadRoastLog` mutation
- `server/src/resolvers/roast.ts` — Added `uploadRoastLog` resolver
- `server/src/utils/r2.ts` — Added `uploadFile` function

---

## 2026-03-26 — On-demand .kpro profile extraction

### Summary
Added on-demand extraction of `.kpro` roast profile files from stored `.klog` data. Instead of parsing and storing the `.kpro` separately at upload time, the server extracts it when a user requests a profile download. The `.klog` file — already stored in R2 — contains the complete `.kpro` as a subset of its header key:value pairs.

### Design decisions

**Extract on demand, don't store separately:** A `.kpro` file is a strict subset of the `.klog` header lines. Since the raw `.klog` is already in R2 and files are small (<100KB), extracting the `.kpro` on each download request is trivial. This avoids redundant storage, simplifies the upload flow, and means a `.kpro` is always in sync with its source `.klog`.

**`downloadProfile` query instead of presigned URL:** Replaced the `downloadUrl` field on `RoastProfile` with a `downloadProfile(roastId)` query that returns `{ fileName, content }`. The client receives the file content as a string and triggers a browser download. This avoids exposing R2 URLs to the client and keeps the extraction logic server-side.

**Key filtering by ordered allowlist:** The extractor uses a fixed ordered list of known `.kpro` keys derived from analyzing real `.kpro` files. Keys not in the list (runtime/hardware data like `ambient_temperature`, `model`, `firmware_version`) are excluded. Optional keys (`profile_description`, `zone3_*`) are included only if present in the `.klog`.

### What informed these decisions
Compared 3 standalone `.kpro` files against their source `.klog` headers. Every `.kpro` key appears verbatim in the `.klog` — the `.kpro` is a pure subset with no transformation needed beyond filtering.

### Files added
(none — all changes are additions to existing files)

### Files modified
- `server/src/lib/klogParser.ts` — Added `extractKproContent()` function
- `server/src/schema/typeDefs.ts` — Added `ProfileDownload` type + `downloadProfile` query, removed `downloadUrl` from `RoastProfile`
- `server/src/resolvers/roast.ts` — Added `downloadProfile` query resolver
- `server/src/utils/r2.ts` — Added `getFileContent()` for fetching stored files

---

## 2026-03-26 — UserBean shortName + intelligent upload matching

### Summary
Added a per-user `shortName` field to `UserBean` so users can map their own abbreviations to beans (e.g. "CHAJ" → "Colombia Honey Apontier Janamajoy"). Added a `previewRoastLog` query that parses a `.klog` file and auto-suggests a bean by matching the `profile_short_name` header against the user's `UserBean.shortName` values.

### Schema changes
- **UserBean:** Added `shortName String?` — per-user abbreviation for the bean
- **Migration:** `add_userbean_shortname`

### GraphQL changes
- `UserBean` type gains `shortName: String`
- `CreateBeanInput` gains `shortName: String`
- `addBeanToLibrary` and `updateUserBean` mutations accept `shortName` parameter
- New `RoastLogPreview` type with parsed metadata + `suggestedBean: UserBean`
- New `previewRoastLog(fileName, fileContent)` query

### Design decisions

**Per-user shortName on UserBean, not on Bean:** Bean is a shared catalog — different users will abbreviate the same bean differently. The `UserBean` join table already stores per-user data (`notes`), so `shortName` fits naturally here.

**Case-insensitive exact match:** The `previewRoastLog` resolver matches `profile_short_name` from the `.klog` against `UserBean.shortName` using Prisma's case-insensitive mode. No fuzzy matching — exact match is predictable and avoids false positives. If a user sets their shortName correctly once, every subsequent upload auto-matches.

**Preview before commit:** The upload flow is now two steps: `previewRoastLog` (parse + suggest, no DB writes) → `uploadRoastLog` (commit with confirmed `beanId`). This gives the client space to show a confirmation UI.

**Parser cleanup:** Moved `profileShortName` and `profileDesigner` into the `ParsedKlog` interface. The `uploadRoastLog` resolver no longer manually re-parses headers — it uses the parsed fields directly.

### Files modified
- `server/prisma/schema.prisma` — Added `shortName` to `UserBean`
- `server/src/schema/typeDefs.ts` — Added `RoastLogPreview` type, `previewRoastLog` query, `shortName` fields
- `server/src/resolvers/bean.ts` — Handle `shortName` in create/update/add
- `server/src/resolvers/roast.ts` — `previewRoastLog` resolver, cleaned up `uploadRoastLog`
- `server/src/lib/klogParser.ts` — Added `profileShortName`, `profileDesigner` to `ParsedKlog`

### Files added
- `server/src/resolvers/bean.test.ts` — 3 tests for shortName CRUD
- `server/src/resolvers/previewRoastLog.test.ts` — 6 tests for preview + matching

---

## 2026-03-26 — Chart library evaluation

### Summary
Evaluated Recharts, Chart.js (react-chartjs-2), and Visx for visualizing and comparing roast curves. The core requirement is overlaying 2–4 roasts on the same chart with 6 series each (~400 points per roast), dual Y-axes (temperature vs ROR/power/fan), event marker annotations, and interactive zoom/pan.

### Decision: Chart.js with react-chartjs-2

**Why Chart.js over the others:**
- **Multi-roast overlay is trivial** — each roast is just more datasets in an array. Recharts requires merging all roasts into a single flat data array with keys like `roast1_spotTemp`, `roast2_spotTemp`, which gets unwieldy.
- **Canvas rendering + built-in LTTB decimation** — handles 9,600+ data points (4 roasts × 6 series × 400 points) at 60fps. Recharts and Visx use SVG, which is fine at this scale but has a lower ceiling.
- **Plugin ecosystem** — `chartjs-plugin-annotation` for event markers and `chartjs-plugin-zoom` for pan/zoom are mature, maintained, and require no custom code. Recharts only has a Brush (no true zoom/pan). Visx requires building everything from scratch.
- **React 19 compatible today** — stable release, not alpha. Visx's React 19 support is only in a v4 alpha.
- **Fastest to implement** — important for a solo developer. Visx offers the most control but at 3–5× the implementation time.

**When we'd reconsider:** If Chart.js's callback-driven tooltip customization proves too limiting for the roast detail view, Visx is the fallback — it gives full SVG/DOM control at the cost of more boilerplate.

### Research artifacts
- `docs/chart-research/recharts.md` — full evaluation with code example
- `docs/chart-research/chartjs.md` — full evaluation with code example
- `docs/chart-research/visx.md` — full evaluation with code example
- `docs/chart-research/recommendation.md` — comparative scoring and final recommendation

---

## 2026-03-26 — Client providers: CSS Modules, gql.tada, Apollo, Clerk, Router (Slices 0–0.5)

### Summary
Wired the full client provider stack in a sequence of focused PRs. CSS Modules with CSS Variables (`tokens.css`) provides the styling foundation with no runtime dependency. gql.tada is configured against the server GraphQL schema for zero-codegen TypeScript inference. Apollo Client 4, ClerkProvider, and React Router are all wired into `main.tsx` with auth pages (`/sign-in`, `/sign-up`) and a `ProtectedRoute` wrapper guarding the app shell. Chart.js and its plugins (`chartjs-plugin-annotation`, `chartjs-plugin-zoom`) were installed at this step as well.

### Design decisions
- CSS Variables over a runtime CSS-in-JS library keeps the bundle small and tokens available to all component stylesheets without prop threading
- gql.tada's schema-first inference catches GraphQL type errors at edit time rather than at codegen time in CI
- `ProtectedRoute` checks Clerk's `isSignedIn` and redirects to `/sign-in` — keeps auth logic in one place rather than scattered across route components

---

## 2026-03-26 — GitHub Actions CI

### Summary
Added a CI workflow (`.github/workflows/ci.yml`) that runs both the client (Vitest) and server (Jest) test suites on every push and pull request. Client job is required; server job runs with `continue-on-error: true` initially because it requires a Postgres test DB that isn't provisioned in CI yet. The workflow documents what secrets need to be added (R2, Clerk) before the server job can be made required.

---

## 2026-03-27 — Server refactoring: type safety, DRY, error handling, service layer, tests

### Summary
A focused refactoring sprint across four PRs before starting the client vertical slices. The goal was to make the server code maintainable before the client started depending on it.

### What changed
- **Type safety + perf indexes (PR #10):** Replaced `any` casts throughout resolvers with proper types; added database indexes on `userId`, `beanId`, and `shareToken` columns for the list queries that would be hit repeatedly.
- **DRY extractions (PR #11):** Pulled repeated ownership-check + not-found patterns into shared helpers; deduplicated resolver boilerplate.
- **Standardized error handling (PR #12):** All resolvers now throw `GraphQLError` with consistent `extensions.code` values (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_USER_INPUT`). Previously a mix of plain `Error` throws and ad-hoc strings.
- **RoastService layer (PR #13):** Extracted DB calls from the `roast` resolver into `server/src/services/RoastService.ts`. Resolvers are now thin; business logic and Prisma calls live in the service.
- **Test coverage (PRs #14–16):** Removed placeholder tests, added CRUD + sharing resolver tests, added edge-case tests for user upsert, upload, download, and bean operations. Server test suite at 55 tests across 7 suites.

---

## 2026-03-31 — UI vertical slices 1–9

### Summary
Built the entire client UI in nine feature-branch slices, each merged as its own PR. Each slice is a full round-trip from GraphQL query to rendered, styled component — no orphaned UI, no placeholder data.

### Slice breakdown
1. **Design tokens + app shell (PR #17):** `AppLayout` with sidebar nav, `tokens.css` applied globally, page skeleton
2. **Dashboard + flavor system (PR #18):** `myRoasts` query, roast list table with sortable columns, `FlavorTag` component, flavor color mapping for the 12-category flavor wheel
3. **Roast detail page (PR #19):** `roastById` query, phase metrics grid, Chart.js roast curve with dual Y-axes (temp + ROR), event marker annotations via `chartjs-plugin-annotation`
4. **Flavor picker modal (PR #20):** Full flavor wheel UI — 12 categories, multi-select, persisted via `updateRoast`
5. **Upload modal (PR #21):** Two-step upload flow — `previewRoastLog` shows parsed metadata + suggested bean before `uploadRoastLog` commits
6. **Bean library + detail pages (PR #22):** `myBeans` query, bean card grid, per-bean roast history table, `UserBean` notes editing
7. **Bean scraping + Add Bean modal (PR #23):** URL import field triggers server-side scraper; manual entry fallback; `createBean` mutation with auto-library-add
8. **Comparison view (PR #24):** `roastsByIds` query, overlaid Chart.js curves for 2–4 roasts, side-by-side metrics table
9. **Settings + shared roast view (PR #25):** `updateTempUnit` mutation with sticky preference, `toggleRoastSharing`, public `/share/:token` page using `roastByShareToken`

### Post-merge fixes (PRs #26–28)
- Bean cards restyled to match approved mockup (title layout, rating display, accent colors)
- Comparison metrics table transposed (roasts as rows, metrics as columns) after UX review
- TypeScript type errors from gql.tada regeneration fixed in CI

---

## 2026-03-31 — v1 polish pass

### Summary
A single PR (#27) addressed several rough edges found during end-to-end review: `tempUnit` preference now persists across sessions via a `userSettings` query called on mount; upload modal passes `notes` through to `createRoast`; `StarRating` half-star rendered via CSS clip rather than a broken `½` glyph; seed data updated with realistic bean names, elevations, and bag notes.

---

## 2026-04-01 — Multi-vendor bean scraper, suggestedFlavors, ParseSupplierModal

### Summary
Extended the bean scraper from a single-vendor prototype to a multi-vendor system (PR #29) covering major specialty roaster Shopify storefronts. Added a paste fallback for Cloudflare-protected sites. Persisted `suggestedFlavors` on the `Bean` model so scraped flavor notes survive across sessions and appear on cards and detail pages.

### Key decisions
- **Vendor-specific extractors with fallback chain:** Each extractor targets known DOM patterns for that vendor; a generic prose-extraction strategy runs if structured fields are missing. Flavors are extracted from free-text descriptions using a curated vocabulary list.
- **Paste fallback:** For sites that block automated fetches (Cloudflare), the UI instructs the user to paste page source. The scraper detects Shopify unicode-escaped HTML and decodes it before extraction.
- **`ParseSupplierModal` as a reusable component:** The URL import + scrape flow is extracted into a standalone modal used in both the Add Bean flow and the new "Re-parse from supplier" action on Bean Detail. A diff preview (`ParseDiffModal`) shows which fields would change before the user confirms an update.
- **Process `Combobox`:** The process field now uses a combobox with known coffee processing methods (Washed, Natural, Honey, etc.) rather than a free text input, reducing data inconsistency.

### Scraper bug fixes (also in PR #29)
- CBC: `itemprop=name` preferred over generic `<h1>` to avoid duplicated store name in bean name; span-pair extraction fixed
- Bodhi Leaf: Shopify unicode-escaped HTML decoded before field extraction
- Flavor validation: invalid/duplicate values filtered before persisting `suggestedFlavors`
- Added `<b>` label strategy and `'varieties'` to `VARIETY_LABELS` for broader vendor coverage

---

## 2026-04-01 — Bean Detail: Score field + editing

### Summary
Added a numeric `score` field (0–100) to the `Bean` model and `BeanScrapeResult` type (PR #31 / commit `851508f`). Score appears in the Bean Detail metadata grid and is populated by the scraper when a vendor publishes a cupping score. Bean Detail editing was also wired up: the metadata grid fields are editable inline and persist via `updateBean`.

### Notes
- `updateBean` field whitelist corrected to include all editable fields; parallel mutations are properly awaited
- `awaitRefetchQueries` added to `createBean` to prevent stale bean list after modal close

---

## 2026-04-01 — E2E test infrastructure + 28 passing behavioral tests

### Summary
Added Playwright E2E test infrastructure and a suite of behavioral user-flow tests covering the full application (PR #31). Tests assert on visible UI outcomes (rendered text, navigation, modal behavior) rather than implementation details.

### Design decisions
- **Behavioral assertions over selector-matching:** Initial runs exposed that many test selectors didn't match actual DOM — tests were rewritten to query by role and visible text, which also serves as an a11y check
- **28 tests, all green:** Covers dashboard load, roast detail navigation, upload flow, bean library, comparison selection, settings, and share link. 30 additional tests were written but left failing as a "dead button audit" — they document UI interactions that exist in the design but aren't yet wired
- Test DB and dev server are managed by Playwright's `webServer` config; no manual setup required to run the suite

---

## 2026-05-05 — Deploy target switched: Vercel + Neon (replacing Heroku)

### Summary
Switched the planned deploy target from Heroku-API + Vercel-frontend to **Vercel for both** (frontend + Apollo Server as serverless functions) with **Neon serverless Postgres** for the database. Nothing has been deployed yet — this is a planning decision, not a migration. CLAUDE.md updated to reflect the new target.

### Why
- **Heroku has no free tier since 2022.** This is a personal/hobby project; paying $5–10/mo for the API alone wasn't justified.
- **Firebase was evaluated and ruled out.** Cloud Functions require the Blaze (pay-as-you-go) plan with a credit card on file since 2020 — not "fully free." Firebase has no Postgres support, so adopting it would force a Firestore rewrite of the entire relational data model. Bad fit.
- **Vercel Hobby + Neon free tier is genuinely free** (no credit card to start). Vercel covers Functions + frontend hosting + edge network. Neon's free tier is 0.5 GB Postgres with serverless autosuspend — well above the working-set size for personal roast tracking.

### Tradeoffs
- **Cold starts on serverless Apollo:** First request after idle takes a few seconds. Acceptable at hobby scale; would matter more for a public-facing product. Mitigations available (Vercel's Fluid Compute keeps warm instances) if it ever becomes annoying.
- **Connection pooling on serverless Postgres:** Prisma + Neon need a pooled connection string (Neon provides one out of the box) to avoid exhausting connections under burst traffic. Will need `directUrl` for migrations and `url` for runtime, both configured in `schema.prisma`.
- **Single-region deploy by default:** Vercel/Neon both default to one region. Fine for a small audience; revisit if latency matters.

### Other free-tier options considered
- **Render free tier:** API spins down after 15 min idle (~30s cold start). Free Postgres expires after 90 days and must be manually recreated. Operationally painful for a project we want to forget about between roasts.
- **Fly.io / Railway:** Both removed truly-free tiers; require credit card for any usage.
- **Cloudflare Workers:** Free tier exists but doesn't run Node — would require rewriting away from `@apollo/server` to a Workers-compatible runtime. Disproportionate to the savings.

### What still needs to happen (not done yet)
- Add `vercel.json` configuring the API as a Vercel Function and routing GraphQL traffic to it
- Provision Neon DB, get the pooled + direct connection strings, set `DATABASE_URL` and `DIRECT_URL` in Vercel project env
- Update `prisma/schema.prisma` with `directUrl = env("DIRECT_URL")` for migrations
- Wire deploy step into the existing `.github/workflows/ci.yml` (or rely on Vercel's GitHub integration for preview + production deploys)
- Migrate Cloudflare R2 credentials (file storage) into Vercel env — that piece doesn't change

### Anti-rollback note
If Vercel's serverless Apollo proves too cold-start-y for actual roast-after-pull-shot workflows, the fallback isn't Heroku — it's **Fly.io** (single config file, real long-running server, $5/mo hobby tier). Keep that escape hatch in mind, but don't plan around it preemptively.
