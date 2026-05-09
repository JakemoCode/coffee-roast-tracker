import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvers } from "./index.js";

// Catches the PR #71 class of bug: a custom field resolver
// (e.g. `Bean: { isLocked }`) gets added but is never exercised by a
// GraphQL-layer test. Default property lookup then returns undefined
// for non-DB fields, the schema's non-nullable contract fails at runtime,
// and the only signal is broken e2e tests.
//
// Rule: every key in `resolvers[Type]` (excluding Query/Mutation and
// scalars) must appear by name in at least one test file that calls
// `executeOperation`. The check is a regex match on the field name —
// loose, but tight enough that adding a new field without a real
// graphql-layer test will fail this check.

const SCALAR_TYPES = new Set(["DateTime", "JSON"]);
const ROOT_TYPES = new Set(["Query", "Mutation", "Subscription"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function readExecuteOperationTestSources(): string {
  return walk(SRC_ROOT)
    .map((f) => fs.readFileSync(f, "utf8"))
    .filter((src) => src.includes("executeOperation"))
    .join("\n");
}

function customFieldResolvers(): { type: string; field: string }[] {
  const out: { type: string; field: string }[] = [];
  for (const [type, fields] of Object.entries(resolvers)) {
    if (ROOT_TYPES.has(type) || SCALAR_TYPES.has(type)) continue;
    if (typeof fields !== "object" || fields === null) continue;
    for (const field of Object.keys(fields)) {
      out.push({ type, field });
    }
  }
  return out;
}

describe("custom field resolvers are exercised by executeOperation tests", () => {
  it("every Type.field resolver appears in at least one executeOperation test", () => {
    const corpus = readExecuteOperationTestSources();
    const orphans = customFieldResolvers().filter(({ field }) => {
      const re = new RegExp(`\\b${field}\\b`);
      return !re.test(corpus);
    });

    expect(orphans).toEqual([]);
  });
});
