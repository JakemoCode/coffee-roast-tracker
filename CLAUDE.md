# Coffee Roast Tracker

## Project Overview

Web app for tracking, analyzing, and sharing home coffee roasts. Users import Kaffelogic `.klog` (JSON) or CSV files, annotate batches, and compare roast phases across beans over time. Optional `.kpro` profile file uploads for sharing.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Apollo Client 4
- **Backend:** Node.js + Apollo Server 4 (GraphQL)
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** Clerk (JWT validation in Apollo context)
- **File storage:** Cloudflare R2 (S3-compatible)
- **Deploy:** Vercel (frontend + API as serverless functions) + Neon (Postgres)

## Monorepo Layout

```
/client  — React + Vite frontend
/server  — Apollo Server + Prisma backend
```

## Commands

```bash
# Root (runs across workspaces)
npm run dev:server       # Start server with hot reload (tsx watch)
npm run dev:client       # Start Vite dev server
npm run build            # Build all workspaces
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:generate      # Regenerate Prisma client

# Server
cd server
npx prisma studio        # Visual DB browser
npx prisma migrate dev   # Create + apply migration
npx prisma db seed       # Run seed script

# Client
cd client
npm run dev              # Vite dev server on :3000
npm run build            # Production build
```

## Architecture Notes

- All authenticated queries/mutations are userId-scoped — never return data across users
- Clerk JWT is validated in Apollo context middleware; userId is resolved per request
- Sharing uses UUID shareTokens — public queries validate `isShared: true` before returning
- R2 presigned URLs are generated server-side for profile downloads
- All temperatures stored in Celsius (Kaffelogic native); Fahrenheit is UI-only via user `tempUnit` preference
- DTR% is derived client-side (`developmentTime / totalDuration`), not stored
- EspressoShot model is scaffolded but unimplemented (v1)
- RoastProfile supports KAFFELOGIC only (v1); other roaster types are stubbed as enum comments

## Testing

**Server (Jest + ts-jest + supertest)**

```bash
cd server
npm test              # Run all server tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- Requires a `coffee_roast_tracker_test` PostgreSQL database
- Configure `server/.env.test` with `DATABASE_URL` pointing to the test DB
- Jest `globalSetup` runs `prisma migrate reset --force` before the suite
- Uses `--experimental-vm-modules` for ESM support
- Test files: `src/**/*.test.ts`

**Client (Vitest + React Testing Library + MSW)**

```bash
cd client
npm test              # Run all client tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- MSW mocks GraphQL responses — add handlers in `client/test/mocks/handlers.ts`
- jsdom environment for DOM rendering
- Test files: `src/**/*.test.{ts,tsx}`

**Both (from root)**

```bash
npm test              # Runs server then client tests sequentially
```

## Conventions

- Server uses ES modules (`"type": "module"`)
- Prisma schema is the source of truth for data models
- GraphQL schema mirrors Prisma models
- Server imports use `.js` extensions in relative paths (Node ESM resolution); client (Vite) does not require extensions

## Git Workflow

- **Never push directly to `main`**
- For each feature or task, create a branch: `type/short-description` (e.g. `feat/client-apollo-setup`, `fix/parser-edge-case`)
- When work is complete, commit to the feature branch, push, and open a PR via `gh pr create`

## Development Workflow

**When resuming frontend work, ALWAYS run `/session-start` first.**
If the frontend-orchestration plugin defines a workflow for your
current task (e.g. `/design-audit`, `/visual-qa`, `/build-component`),
follow that workflow exactly — do not skip steps or substitute
memory for reading actual project docs.

For every task:

1. Run `/session-start` to orient (reads BUILD_STATUS.md, etc.)
2. Create a feature branch off `main`
3. Implement the change
4. Write or update unit tests
5. **Write or update integration tests** for any form/modal flow — render the parent, exercise the child's features through it, verify data round-trips
6. **Write or update E2E user flow tests** (`e2e/` directory) — every feature must have Playwright tests covering the full user interaction, not just visibility checks
7. Run all test suites (unit + integration + E2E)
8. Fix any failures
9. Confirm all tests pass
10. Before committing: fire off `code-reviewer` and `code-simplifier` subagents in parallel to review the diff for quality, cleanliness, and precision — apply any fixes before committing
11. Commit, push, and open a PR
12. Run `/review-requirements` to check overall build status

## Session End Checklist

Before ending a session, complete these steps:

1. **Update `docs/BUILD_STATUS.md`** — current test counts,
   what was completed, what's next
2. **Update memory** — any new feedback, project state changes,
   or decisions made during the session
3. **Clean up merged branches** — delete local branches that
   have been merged to main
4. **Push any uncommitted doc changes** to main
5. **Print handoff summary** — what's done, what's next, any
   blockers for the next session
