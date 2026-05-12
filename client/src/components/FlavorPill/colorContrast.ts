type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function hexToRgbString(hex: string): string {
  const [r, g, b] = parseHex(hex);
  return `${r}, ${g}, ${b}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      case bN:
        h = (rN - gN) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tN = t;
    if (tN < 0) tN += 1;
    if (tN > 1) tN -= 1;
    if (tN < 1 / 6) return p + (q - p) * 6 * tN;
    if (tN < 1 / 2) return q;
    if (tN < 2 / 3) return p + (q - p) * (2 / 3 - tN) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const cN = c / 255;
    return cN <= 0.03928 ? cN / 12.92 : Math.pow((cN + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Compose a foreground hex with `alpha` over a `bg` hex (sRGB blend).
// Used to approximate the *effective* pill bg color, since pills draw
// rgba(color, 0.15) on top of the page bg.
function composite(fgHex: string, alpha: number, bgHex: string): Rgb {
  const [fr, fg, fb] = parseHex(fgHex);
  const [br, bg, bb] = parseHex(bgHex);
  return [
    Math.round(fr * alpha + br * (1 - alpha)),
    Math.round(fg * alpha + bg * (1 - alpha)),
    Math.round(fb * alpha + bb * (1 - alpha)),
  ];
}

interface ReadableTextOptions {
  /** Page background hex. Defaults to white. */
  bg?: string;
  /** Alpha of the foreground color over the page bg (0..1). When set,
   *  contrast is computed against the composited effective bg. */
  bgAlpha?: number;
  minRatio?: number;
}

// Find a text color derived from `hex` that reads on the (optionally
// composited) background. In light mode we darken the source color;
// in dark mode we lighten it — so the pill text always reads.
export function readableTextColor(hex: string, opts: ReadableTextOptions = {}): string {
  const { bg = "#ffffff", bgAlpha, minRatio = 4.5 } = opts;
  const [r, g, b] = parseHex(hex);
  const effectiveBg: Rgb = bgAlpha != null
    ? composite(hex, bgAlpha, bg)
    : parseHex(bg);
  if (contrastRatio([r, g, b], effectiveBg) >= minRatio) return hex;

  const [h, s] = rgbToHsl(r, g, b);
  const bgLum = relativeLuminance(...effectiveBg);
  // Walk lightness toward the contrasting end of the scale.
  const lightening = bgLum < 0.5;
  const start = lightening ? 0.55 : 0.45;
  const end = lightening ? 0.95 : 0.10;
  const step = lightening ? 0.05 : -0.05;

  for (let l = start; lightening ? l <= end : l >= end; l += step) {
    const rgb = hslToRgb(h, s, l);
    if (contrastRatio(rgb, effectiveBg) >= minRatio) {
      return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return lightening ? "#ede6dd" : "#1a1a1a";
}
