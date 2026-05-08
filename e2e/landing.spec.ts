import { test, expect, waitForLanding, waitForBeanLibrary, waitForBeanRoastsLoaded } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  LANDING PAGE (logged-out visitor)
// ════════════════════════════════════════════════════════════════════

test.describe("Landing Page", () => {
  test("shows community stats (total roasts and beans)", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    // Should display total roast and bean counts
    await expect(page.locator("text=/\\d+ roasts? logged/i")).toBeVisible();
    await expect(page.locator("text=/\\d+ beans? tracked/i")).toBeVisible();
  });

  test("shows popular beans section with clickable cards", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    // Should show popular beans
    await expect(page.locator("text=/popular beans/i")).toBeVisible();
    // At least one bean card should be visible (seeded data has 8 beans)
    const beanCards = page.locator("[data-testid='bean-card']");
    await expect(beanCards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking a popular bean navigates to its detail page", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    const beanCards = page.locator("[data-testid='bean-card']");
    await beanCards.first().click();
    await expect(page).toHaveURL(/\/beans\//);
  });

  test("shows sign-up CTA with clear messaging", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    // Should have a sign-up call to action
    await expect(page.locator("text=/sign up/i").first()).toBeVisible();
    // Should mention it's free
    await expect(page.locator("text=/free/i").first()).toBeVisible();
  });

  test("does NOT show Upload or My Roasts nav items to logged-out users", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    await expect(page.locator("button:text('Upload')")).not.toBeVisible();
    await expect(page.locator("nav >> text='My Roasts'")).not.toBeVisible();
  });

  test("shows Bean Library nav link for logged-out users", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    await expect(page.locator("nav >> text=/beans/i").first()).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  LANDING PAGE → PUBLIC BROWSING FLOW
// ════════════════════════════════════════════════════════════════════

test.describe("Public browsing from landing", () => {
  test("logged-out user can navigate to bean library and browse all beans", async ({ page }) => {
    await page.goto("/");
    await waitForLanding(page);
    await page.click("nav >> text=/beans/i");
    await expect(page).toHaveURL("/beans");
    await waitForBeanLibrary(page);
    // Should see beans from all users (community view)
    const beanCards = page.locator("[data-testid='bean-card']");
    await expect(beanCards.first()).toBeVisible();
    const count = await beanCards.count();
    expect(count).toBeGreaterThanOrEqual(3); // Seeded data has 8 beans across 3 users
  });

  test("logged-out user can view a bean detail page", async ({ page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    const beanCards = page.locator("[data-testid='bean-card']");
    await beanCards.first().click();
    await expect(page).toHaveURL(/\/beans\//);
    // Should see bean info but NOT edit controls
    await expect(page.locator("button:text('Edit')")).not.toBeVisible();
    await expect(page.locator("button:text('+ Add Bean')")).not.toBeVisible();
  });

  test("logged-out user can view a public roast detail page", async ({ page }) => {
    // Use Kenya AA explicitly — it has multiple public roasts in seed.
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.locator("[data-testid='bean-card']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    await waitForBeanRoastsLoaded(page);

    const roastRow = page.locator("[data-testid='roast-row']").first();
    await expect(roastRow).toBeVisible({ timeout: 5_000 });
    await roastRow.click();
    await expect(page).toHaveURL(/\/roasts\//);
    // Should see chart and metrics but NOT edit controls
    await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button:text('Delete')")).not.toBeVisible();
  });
});
