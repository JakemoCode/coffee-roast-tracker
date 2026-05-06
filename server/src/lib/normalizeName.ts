// Lowercase + collapse all internal whitespace runs to a single space, then trim.
// Used for case/whitespace-insensitive Bean dedup. Must match the SQL backfill
// in migration 20260506000000_dedup_hardening.
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}
