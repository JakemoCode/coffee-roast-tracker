import { describe, it, expect } from "vitest";
import { readFromPath, labelForPath } from "../backCrumb";

describe("readFromPath", () => {
  it("returns the path when state.from is a valid internal path", () => {
    expect(readFromPath({ from: "/beans/abc" })).toBe("/beans/abc");
    expect(readFromPath({ from: "/compare?ids=1,2" })).toBe("/compare?ids=1,2");
    expect(readFromPath({ from: "/" })).toBe("/");
  });

  it("returns null when state is null, undefined, or non-object", () => {
    expect(readFromPath(null)).toBeNull();
    expect(readFromPath(undefined)).toBeNull();
    expect(readFromPath("nope")).toBeNull();
    expect(readFromPath(42)).toBeNull();
  });

  it("returns null when state.from is missing or wrong type", () => {
    expect(readFromPath({ other: "thing" })).toBeNull();
    expect(readFromPath({ from: 5 })).toBeNull();
    expect(readFromPath({ from: { path: "/x" } })).toBeNull();
  });

  it("rejects external URLs to prevent open redirects", () => {
    expect(readFromPath({ from: "https://evil.example.com" })).toBeNull();
    expect(readFromPath({ from: "//evil.example.com" })).toBeNull();
    expect(readFromPath({ from: "javascript:alert(1)" })).toBeNull();
  });
});

describe("labelForPath", () => {
  it("maps known route prefixes to labels", () => {
    expect(labelForPath("/")).toBe("My Roasts");
    expect(labelForPath("/?upload=true")).toBe("My Roasts");
    expect(labelForPath("/beans/abc")).toBe("Bean");
    expect(labelForPath("/compare?ids=1,2")).toBe("Compare");
    expect(labelForPath("/roasts/abc")).toBe("Roast");
  });

  it("falls back to 'Back' for unknown routes", () => {
    expect(labelForPath("/profile")).toBe("Back");
    expect(labelForPath("/anything-else")).toBe("Back");
  });
});
