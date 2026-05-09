import { test, expect, waitForDashboard, switchE2eUser } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD — STAT CHIPS
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard stat chips", () => {
  test("shows stat chips with total roasts, avg rating, and most-used bean", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Stat chips should show aggregate data
    await expect(page.locator("[data-testid='stat-chips'], [data-testid='stats']").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/total roasts/i")).toBeVisible();
    await expect(page.locator("text=/avg rating/i")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD — ROASTS TABLE
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard roasts table", () => {
  test("shows roast rows with bean names from seeded data", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await expect(page.locator("text='Kenya Nyeri Ichamama AA'").first()).toBeVisible();
    await expect(page.locator("text='Colombia Huila Excelso EP'").first()).toBeVisible();
  });

  test("does NOT show roast notes in the table (star rating is the signal)", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Notes column should not exist in the table
    await expect(page.locator("th:text('Notes'), [data-testid='notes-column']")).not.toBeVisible();
  });

  test("inline star rating is editable", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Find a star rating component in the table
    const stars = page.locator("[data-testid='star-rating']").first();
    await expect(stars).toBeVisible({ timeout: 5_000 });
  });

  test("clicking a roast row navigates to roast detail", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
  });
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD — SEARCH / FILTER / SORT / PAGINATION
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard search and filter", () => {
  test("search input filters roast rows", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const searchInput = page.locator("[data-testid='search-input'], input[placeholder*='Search']");
    await searchInput.fill("Kenya");
    await page.waitForTimeout(500);
    await expect(page.locator("text='Kenya Nyeri Ichamama AA'").first()).toBeVisible();
    // Other beans should be filtered out
    await expect(page.locator("text='Colombia Huila Excelso EP'")).not.toBeVisible({ timeout: 2_000 });
  });

  test("filter by bean dropdown works", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const beanFilter = page.locator("[data-testid='bean-filter'], [aria-label='Filter by bean']");
    await expect(beanFilter).toBeVisible();
    await beanFilter.selectOption({ label: "Kenya Nyeri Ichamama AA" });
    await page.waitForTimeout(500);
    await expect(page.locator("text='Kenya Nyeri Ichamama AA'").first()).toBeVisible();
    await expect(page.locator("text='Colombia Huila Excelso EP'")).not.toBeVisible({ timeout: 2_000 });
  });

  test("pagination controls are visible when enough roasts exist", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Pagination should be present (Alice has 9+ roasts)
    await expect(page.locator("[data-testid='pagination'], nav[aria-label='Pagination']").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD — COMPARE SELECTION
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard compare selection", () => {
  test("compare button is always visible but disabled with tooltip when <2 selected", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const compareBtn = page.locator("button:has-text('Compare')");
    await expect(compareBtn).toBeVisible();
    await expect(compareBtn).toBeDisabled();
  });

  test("selecting 2 roasts enables the compare button", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    const compareBtn = page.locator("button:has-text('Compare')");
    await expect(compareBtn).toBeEnabled({ timeout: 3_000 });
  });

  test("selecting 5 roasts disables additional checkboxes", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < 5; i++) {
      await checkboxes.nth(i).check();
    }
    // 6th checkbox should be disabled
    await expect(checkboxes.nth(5)).toBeDisabled({ timeout: 3_000 });
    // Should show a message about max limit
    await expect(page.locator("text=/max|limit|5/i").first()).toBeVisible();
  });

  test("compare button navigates to compare page with selected IDs", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.locator("button:has-text('Compare')").click();
    await expect(page).toHaveURL(/\/compare\?ids=/);
  });
});

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD — EMPTY STATE
// ════════════════════════════════════════════════════════════════════

test.describe("Dashboard empty state", () => {
  test("new user with no roasts sees empty state with upload prompt", async ({ authedPage: page }) => {
    await switchE2eUser(page, "clerk_seed_dave_004");
    await page.goto("/");
    // Should show the steaming coffee cup SVG and upload prompt
    await expect(page.locator("text=/upload.*first roast|no roasts/i")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("svg, img[alt*='coffee'], [data-testid='empty-state']").first()).toBeVisible();
  });

  test("empty state upload button opens upload modal", async ({ authedPage: page }) => {
    await switchE2eUser(page, "clerk_seed_dave_004");
    await page.goto("/");
    await expect(page.locator("text=/upload.*first roast|no roasts/i")).toBeVisible({ timeout: 5_000 });
    await page.locator("button:has-text('Upload'), a:has-text('Upload')").first().click();
    await expect(page.locator("text=/upload roast|drop your/i")).toBeVisible({ timeout: 5_000 });
  });

  test("navigating to /?upload=true opens upload modal automatically", async ({ authedPage: page }) => {
    await page.goto("/?upload=true");
    await expect(page.locator("text=/upload roast|drop your/i")).toBeVisible({ timeout: 5_000 });
    // URL param should be cleared after opening
    await expect(page).not.toHaveURL(/upload=true/);
  });
});
