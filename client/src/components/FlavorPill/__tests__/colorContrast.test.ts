import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  hexToRgbString,
  parseHex,
  readableTextColor,
} from "../colorContrast";

const WHITE: [number, number, number] = [255, 255, 255];

function contrastAgainstWhite(hex: string): number {
  return contrastRatio(parseHex(hex), WHITE);
}

describe("colorContrast", () => {
  describe("parseHex", () => {
    it("parses hex colors with leading #", () => {
      expect(parseHex("#ff0080")).toEqual([255, 0, 128]);
    });

    it("parses hex colors without leading #", () => {
      expect(parseHex("00ff00")).toEqual([0, 255, 0]);
    });
  });

  describe("hexToRgbString", () => {
    it("returns comma-separated rgb channels for use in rgba()", () => {
      expect(hexToRgbString("#1a2b3c")).toBe("26, 43, 60");
    });
  });

  describe("readableTextColor", () => {
    it("returns the original color when contrast already meets the minimum", () => {
      // dark navy on white — well above 4.5:1
      expect(readableTextColor("#0a0a40")).toBe("#0a0a40");
    });

    it("darkens a low-contrast yellow until it meets WCAG AA", () => {
      const result = readableTextColor("#ffd700");
      expect(result).not.toBe("#ffd700");
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrastAgainstWhite(result)).toBeGreaterThanOrEqual(4.5);
    });

    it("darkens a tan/tobacco shade until it meets WCAG AA", () => {
      const result = readableTextColor("#c19a6b");
      expect(result).not.toBe("#c19a6b");
      expect(contrastAgainstWhite(result)).toBeGreaterThanOrEqual(4.5);
    });

    it("returns a darker shade for white (which has zero contrast against white)", () => {
      const result = readableTextColor("#ffffff");
      expect(result).not.toBe("#ffffff");
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
