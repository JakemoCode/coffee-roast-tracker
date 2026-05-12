import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// WCAG 2.1 contrast assertions for the design tokens. Catches accidental
// palette regressions — e.g. a tweak to `--color-text-secondary` that drops
// it below 4.5:1 on `--color-bg` in dark mode.
//
// Thresholds (WCAG AA):
//   - Normal body text:  4.5:1
//   - Large/UI text:     3.0:1
//
// We parse the actual token CSS so a token rename in production breaks the
// test instead of silently passing against stale literals.

const __filename = fileURLToPath(import.meta.url);
const STYLES_DIR = path.resolve(path.dirname(__filename), "..");

function parseTokens(file: string): Record<string, string> {
  const src = fs.readFileSync(path.join(STYLES_DIR, file), "utf8");
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/--(color-[a-z-]+):\s*([^;]+);/g)) {
    out[`--${m[1]}`] = m[2]!.trim();
  }
  return out;
}

const lightTokens = parseTokens("tokens.css");
const darkTokens = { ...lightTokens, ...parseTokens("dark.css") };

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// WCAG relative luminance — sRGB → linear → weighted sum.
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

interface Pair {
  name: string;
  fg: string;
  bg: string;
  min: number;
}

function ratiosFor(tokens: Record<string, string>, pairs: Pair[]) {
  return pairs.map((p) => ({
    name: p.name,
    min: p.min,
    actual: contrast(tokens[p.fg]!, tokens[p.bg]!),
  }));
}

// Core text/bg pairs that must read at AA body-text contrast (4.5:1).
const BODY_TEXT_PAIRS: Pair[] = [
  { name: "text on bg",            fg: "--color-text",           bg: "--color-bg",         min: 4.5 },
  { name: "text on bg-surface",    fg: "--color-text",           bg: "--color-bg-surface", min: 4.5 },
  { name: "text on bg-muted",      fg: "--color-text",           bg: "--color-bg-muted",   min: 4.5 },
  { name: "text-secondary on bg",  fg: "--color-text-secondary", bg: "--color-bg",         min: 4.5 },
  { name: "text-muted on bg",      fg: "--color-text-muted",     bg: "--color-bg",         min: 4.5 },
  { name: "on-header on header",   fg: "--color-on-header",      bg: "--color-header",     min: 4.5 },
  { name: "inverse on action",     fg: "--color-text-inverse",   bg: "--color-action",     min: 4.5 },
];

// Status/UI element pairs — 3:1 is the floor for "large text" and UI
// components per WCAG AA. We assert 3.0:1 here.
const UI_PAIRS: Pair[] = [
  { name: "success on bg",   fg: "--color-success", bg: "--color-bg", min: 3.0 },
  { name: "warning on bg",   fg: "--color-warning", bg: "--color-bg", min: 3.0 },
  { name: "error on bg",     fg: "--color-error",   bg: "--color-bg", min: 3.0 },
  { name: "info on bg",      fg: "--color-info",    bg: "--color-bg", min: 3.0 },
  { name: "action on bg",    fg: "--color-action",  bg: "--color-bg", min: 3.0 },
];

describe("design token contrast (WCAG AA)", () => {
  for (const themeName of ["light", "dark"] as const) {
    const tokens = themeName === "light" ? lightTokens : darkTokens;

    describe(`${themeName} theme`, () => {
      it.each(ratiosFor(tokens, BODY_TEXT_PAIRS))(
        "$name has ≥ $min:1 contrast (actual: $actual)",
        ({ actual, min }) => {
          expect(actual).toBeGreaterThanOrEqual(min);
        },
      );

      it.each(ratiosFor(tokens, UI_PAIRS))(
        "$name has ≥ $min:1 contrast (actual: $actual)",
        ({ actual, min }) => {
          expect(actual).toBeGreaterThanOrEqual(min);
        },
      );
    });
  }
});
