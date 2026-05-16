import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "../../test/prisma-client.js";
import { FlavorService } from "./flavorService.js";

let service: FlavorService;

beforeAll(() => {
  service = new FlavorService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FlavorService.parseSupplierNotes", () => {
  it("matches exact single words: 'honey and caramel'", async () => {
    const results = await service.parseSupplierNotes("honey and caramel");
    const names = results.map((d) => d.name);
    expect(names).toContain("Honey");
    // "caramel" stems to the same as "caramelized"
    expect(names).toContain("Caramelized");
  });

  it("matches multi-word phrase substring: 'dark chocolate'", async () => {
    const results = await service.parseSupplierNotes(
      "Rich dark chocolate finish",
    );
    const names = results.map((d) => d.name);
    expect(names).toContain("Dark chocolate");
    // Plain "Chocolate" is also a single-word descriptor word present in text
    expect(names).toContain("Chocolate");
  });

  it("single word 'chocolate' matches Chocolate but NOT Dark chocolate", async () => {
    // Multi-word descriptors require every word to match in text (or the
    // phrase to appear verbatim). "chocolate notes" lacks "dark".
    const results = await service.parseSupplierNotes("chocolate notes");
    const names = results.map((d) => d.name);
    expect(names).toContain("Chocolate");
    expect(names).not.toContain("Dark chocolate");
  });

  it("matches via Porter stemming: 'fermenting' matches 'Fermented' descriptor", async () => {
    const results = await service.parseSupplierNotes("fermenting character");
    const names = results.map((d) => d.name);
    expect(names).toContain("Fermented");
  });

  it("matches via de-plural exact: 'berries' does NOT match Blueberry/Raspberry", async () => {
    // De-plural is now EXACT-word only, not substring. "berries" → "berry",
    // which does not equal "blueberry"/"raspberry". And "Berry" itself is
    // a Tier 2 parent (filtered). So no berry match unless a specific berry
    // is named in the text.
    const results = await service.parseSupplierNotes(
      "bright berries and citrus",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Blueberry");
    expect(names).not.toContain("Raspberry");
    expect(names).not.toContain("Strawberry");
    expect(names).not.toContain("Blackberry");
    expect(names).not.toContain("Berry"); // parent, filtered
  });

  it("matches de-plural exact when descriptor is the singular: 'raisins' matches Raisin", async () => {
    const results = await service.parseSupplierNotes(
      "dense raisins and molasses",
    );
    const names = results.map((d) => d.name);
    expect(names).toContain("Raisin");
  });

  it("excludes Tier 2 parent descriptors from parser output", async () => {
    // "Berry", "Citrus fruit", "Dried fruit", "Other fruit", "Cocoa",
    // "Floral" (descriptor), "Brown spice", "Brown sugar" etc. are
    // Tier 2 nodes with Tier 3 children. They must never appear in
    // parseSupplierNotes results — only their leaf children can.
    const text =
      "berry citrus fruit dried fruit other fruit cocoa floral brown spice brown sugar nutty";
    const results = await service.parseSupplierNotes(text);
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Berry");
    expect(names).not.toContain("Citrus fruit");
    expect(names).not.toContain("Dried fruit");
    expect(names).not.toContain("Other fruit");
    expect(names).not.toContain("Cocoa");
    expect(names).not.toContain("Floral");
    expect(names).not.toContain("Brown spice");
    expect(names).not.toContain("Brown sugar");
    expect(names).not.toContain("Nutty");
  });

  it("multi-word descriptors need ALL words present: 'fruit' alone does not match 'Citrus fruit'", async () => {
    // Even setting parent filtering aside, the new rule is stricter:
    // a lone "fruit" word cannot trigger a multi-word descriptor.
    const results = await service.parseSupplierNotes("hints of fruit");
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Citrus fruit");
    expect(names).not.toContain("Dried fruit");
    expect(names).not.toContain("Other fruit");
  });

  it("does NOT match substrings inside descriptor names (no Hay-like / Bitter false positives)", async () => {
    // Old Strategy 4 caused "like" to match Hay-like/Herb-like, "bit" to
    // match Bitter, "tea" to match Black Tea. These must be dead.
    const results = await service.parseSupplierNotes(
      "like a little bit of tea app",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Hay-like");
    expect(names).not.toContain("Herb-like");
    expect(names).not.toContain("Bitter");
    expect(names).not.toContain("Black Tea");
    expect(names).not.toContain("Apple");
  });

  it("returns full FlavorDescriptor objects with color and category", async () => {
    const results = await service.parseSupplierNotes("honey");
    const honey = results.find((d) => d.name === "Honey");
    expect(honey).toBeDefined();
    expect(honey!.id).toBeDefined();
    expect(honey!.color).toBeDefined();
    expect(honey!.category).toBeDefined();
    expect(honey!.isOffFlavor).toBe(false);
    expect(honey!.isParent).toBe(false);
  });

  it("matches SM Suke Quto bag notes: specific leaves, not parents", async () => {
    // Real Sweet Maria's Suke Quto description.
    const sukeQutoNotes = `Suke Quto is a powerhouse dry-process coffee, intensely fruited
      and aromatic. City roasts produced potent sweetness, dominated by forward
      fruit notes of cooked peach and tropical accents. The wet aroma had a
      strong syrupy sweetness of dark sugar and honey. Tropical notes such as
      dried mango, papaya, and pineapple. Acidity underscored by fruity tones,
      like red berry and orange. cocoa/chocolate at Full City.`;
    const results = await service.parseSupplierNotes(sukeQutoNotes);
    const names = results.map((d) => d.name);

    // Must contain the specific leaves named in text
    expect(names).toContain("Honey");
    expect(names).toContain("Orange");
    expect(names).toContain("Peach");
    expect(names).toContain("Pineapple");
    expect(names).toContain("Chocolate");
    // Tropical extensions beyond the SCA 2016 wheel — Sweet Maria's
    // notes routinely cite these, so the seed now includes them.
    expect(names).toContain("Mango");
    expect(names).toContain("Papaya");

    // Cocoa is a PARENT (has Chocolate + Dark chocolate children) — filtered.
    expect(names).not.toContain("Cocoa");

    // "dark chocolate" phrase is not in the text; only Chocolate matches.
    expect(names).not.toContain("Dark chocolate");

    // No false positives from parents
    expect(names).not.toContain("Berry");
    expect(names).not.toContain("Citrus fruit");
    expect(names).not.toContain("Other fruit");
    expect(names).not.toContain("Dried fruit");
    expect(names).not.toContain("Brown spice");
    expect(names).not.toContain("Brown sugar");
    expect(names).not.toContain("Floral");

    // Old substring false positives — "apple" inside "pineapple",
    // "like" matching "Hay-like"/"Herb-like", etc.
    expect(names).not.toContain("Apple");
    expect(names).not.toContain("Hay-like");
    expect(names).not.toContain("Herb-like");
    expect(names).not.toContain("Sour aromatics");

    // The total should be compact — a handful of matches, not dozens.
    expect(results.length).toBeLessThanOrEqual(12);
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  it("returns empty array for empty input", async () => {
    const results = await service.parseSupplierNotes("");
    expect(results).toEqual([]);
  });

  it("returns empty array for whitespace-only input", async () => {
    const results = await service.parseSupplierNotes("   ");
    expect(results).toEqual([]);
  });

  it("returns empty array when no descriptors match", async () => {
    const results = await service.parseSupplierNotes(
      "xyzzy foobarbaz quxquux",
    );
    expect(results).toEqual([]);
  });

  it("returns each descriptor at most once", async () => {
    const results = await service.parseSupplierNotes(
      "chocolate chocolate dark chocolate cocoa chocolate",
    );
    const names = results.map((d) => d.name);
    const chocolateCount = names.filter((n) => n === "Chocolate").length;
    const darkChocolateCount = names.filter(
      (n) => n === "Dark chocolate",
    ).length;
    expect(chocolateCount).toBe(1);
    expect(darkChocolateCount).toBe(1);
  });

  it("does not match off-flavor descriptors", async () => {
    const results = await service.parseSupplierNotes(
      "rubber and petroleum with medicinal notes",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Rubber");
    expect(names).not.toContain("Petroleum");
    expect(names).not.toContain("Medicinal");
  });

  it("does not match isQuality descriptors: 'bittering tone' does NOT match Bitter", async () => {
    // "Bitter" is a pure sensory quality — flagged isQuality: true and excluded
    // from parseSupplierNotes. "bittering" also stems to the same as "bitter"
    // via Porter, so this confirms the isQuality filter blocks it entirely.
    const results = await service.parseSupplierNotes(
      "bittering tone with a bitter finish",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Bitter");
  });

  it("does not match isQuality descriptors: 'fresh rue herb' does NOT match Fresh", async () => {
    // "Fresh" is a pure sensory adjective — flagged isQuality: true.
    const results = await service.parseSupplierNotes(
      "fresh rue herb and bright acidity",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Fresh");
  });

  it("does not match isQuality descriptors: Pungent, Overall sweet, Sweet Aromatics, Sour aromatics", async () => {
    const results = await service.parseSupplierNotes(
      "pungent overall sweet sweet aromatics sour aromatics",
    );
    const names = results.map((d) => d.name);
    expect(names).not.toContain("Pungent");
    expect(names).not.toContain("Overall sweet");
    expect(names).not.toContain("Sweet Aromatics");
    expect(names).not.toContain("Sour aromatics");
  });

  it("is case-insensitive", async () => {
    const results = await service.parseSupplierNotes("HONEY AND CHOCOLATE");
    const names = results.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Chocolate");
  });
});
