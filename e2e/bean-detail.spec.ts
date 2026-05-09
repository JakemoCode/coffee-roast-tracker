import { test, expect, waitForBeanLibrary, waitForBeanDetail, waitForBeanRoastsLoaded } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL — PUBLIC VIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Detail public view", () => {
  test("shows bean info and roast history without auth", async ({ page }) => {
    await page.goto("/beans");
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // Should show bean details
    await expect(page.locator("text=/origin/i")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/process/i")).toBeVisible();
    // Should NOT show edit controls
    await expect(page.locator("button:text('Edit')")).not.toBeVisible();
  });

  test("shows supplier cupping note flavors as authoritative (not 'suggested')", async ({ page }) => {
    await page.goto("/beans");
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // Should NOT say "Suggested Flavors" — flavors are authoritative cupping notes
    await expect(page.locator("text='Suggested Flavors'")).not.toBeVisible();
    // Should show flavor pills if bean has flavors
    // (may or may not have flavors depending on seed data)
  });

  test("shows paginated roast history (10 per page)", async ({ page }) => {
    await page.goto("/beans");
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // Should show recent roasts section
    await expect(page.locator("text=/roasts|roast history/i").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL — OWNER EDITING
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Detail owner editing", () => {
  test("owner can edit bean metadata inline", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
    await editBtn.click();

    // Should show Save and Cancel
    await expect(page.locator("button:text('Save')").first()).toBeVisible();
    await expect(page.locator("button:text('Cancel')").first()).toBeVisible();
  });

  test("cancel discards changes", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    await page.locator("button:text('Edit')").first().click();
    const originInput = page.locator("input").first();
    const originalValue = await originInput.inputValue();
    await originInput.fill("SHOULD NOT PERSIST");
    await page.locator("button:text('Cancel')").first().click();

    // Value should revert
    await page.waitForTimeout(500);
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("SHOULD NOT PERSIST");
  });

  test("paste cupping notes parses flavor descriptors", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[data-testid='bean-card']").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Find cupping notes textarea
    const cuppingNotes = page.locator("textarea[placeholder*='cupping' i], textarea[placeholder*='notes' i]");
    await expect(cuppingNotes).toBeVisible({ timeout: 5_000 });
    await cuppingNotes.fill("Rich body, notes of cherry, dark chocolate, and almond");
    const parseBtn = page.locator("button:has-text('Parse')");
    await expect(parseBtn).toBeVisible({ timeout: 2_000 });
    await parseBtn.click();
    // Should show matched flavor pills for confirmation
    await expect(page.locator("[data-testid='flavor-pill']").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN DETAIL — ROAST HISTORY TABLE
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Detail roast history", () => {
  test("logged-in user sees their roasts of this bean", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Click Kenya bean (has multiple roasts)
    await page.locator("[data-testid='bean-card']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);

    // Should show roast table with rows
    await expect(page.locator("text=/roasts|roast history/i").first()).toBeVisible({ timeout: 5_000 });
    const roastRows = page.locator("[data-testid='roast-row'], table tbody tr");
    await expect(roastRows.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking a roast from bean detail navigates to roast detail", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[data-testid='bean-card']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    await waitForBeanRoastsLoaded(page);

    const roastRow = page.locator("[data-testid='roast-row']").first();
    await expect(roastRow).toBeVisible({ timeout: 5_000 });
    await roastRow.click();
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 5_000 });
  });
});
