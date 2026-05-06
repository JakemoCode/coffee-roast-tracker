-- Dedup hardening: case/whitespace-insensitive Bean name dedup,
-- content-hash-based Roast dedup.

-- Bean.normalizedName: lowercased, whitespace-collapsed name.
ALTER TABLE "Bean" ADD COLUMN "normalizedName" TEXT;

-- Backfill existing rows. If two rows collapse to the same value, the unique
-- index below will fail and the migration aborts — resolve duplicates manually
-- and re-run.
UPDATE "Bean"
SET "normalizedName" = TRIM(REGEXP_REPLACE(LOWER("name"), '\s+', ' ', 'g'));

CREATE UNIQUE INDEX "Bean_normalizedName_key" ON "Bean"("normalizedName");

-- Roast.contentHash: SHA-256 hex digest of the source .klog file contents.
-- Nullable for back-compat; legacy rows have NULL and Postgres NULLS DISTINCT
-- means they don't collide with each other or with new rows.
ALTER TABLE "Roast" ADD COLUMN "contentHash" TEXT;

CREATE UNIQUE INDEX "Roast_userId_contentHash_key" ON "Roast"("userId", "contentHash");
