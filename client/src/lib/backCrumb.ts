// Origin pages stash their own route in `location.state.from` when navigating
// to a destination that wants a context-aware back-crumb. The destination
// reads it back, picks a label from `labelForPath`, and renders the link.
// Lost on hard refresh — destinations should fall back to a sane default.

export function readFromPath(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const from = (state as { from?: unknown }).from;
  if (typeof from !== "string") return null;
  // Reject anything that isn't an internal path so a crafted history.state
  // can't turn the back-crumb into an open redirect. Must start with a
  // single "/" — `//host` is a protocol-relative URL the browser treats as
  // external.
  if (!from.startsWith("/") || from.startsWith("//")) return null;
  return from;
}

export function labelForPath(path: string): string {
  if (path === "/" || path.startsWith("/?")) return "My Roasts";
  if (path.startsWith("/beans")) return "Bean";
  if (path.startsWith("/roasts")) return "Roast";
  return "Back";
}
