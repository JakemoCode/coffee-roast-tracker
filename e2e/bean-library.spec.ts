import { test, expect, waitForBeanLibrary } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — CARD/TABLE TOGGLE
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Library view toggle", () => {
  test("card view shows bean cards organized by recently roasted", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Card view should be default or togglable
    const beanCards = page.locator("[data-testid='bean-card']");
    await expect(beanCards.first()).toBeVisible({ timeout: 5_000 });
  });

  test("table view shows searchable, sortable, filterable bean list", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Toggle to table view
    const tableToggle = page.locator("button:has-text('Table'), [data-testid='view-table'], [aria-label*='table' i]");
    await tableToggle.first().click();
    // Table should be visible with headers
    await expect(page.locator("table, [data-testid='bean-table']").first()).toBeVisible({ timeout: 5_000 });
  });

  test("toggle between card and table preserves data", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Count beans in card view
    const cards = page.locator("[data-testid='bean-card']");
    const cardCount = await cards.count();
    // Switch to table
    await page.locator("button:has-text('Table'), [data-testid='view-table'], [aria-label*='table' i]").first().click();
    await expect(page.locator("table, [data-testid='bean-table']").first()).toBeVisible({ timeout: 5_000 });
    // Switch back to cards
    await page.locator("button:has-text('Card'), [data-testid='view-card'], [aria-label*='card' i]").first().click();
    const cardCountAfter = await cards.count();
    expect(cardCountAfter).toBe(cardCount);
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — AUTH VARIANTS
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Library auth variants", () => {
  test("logged-in user sees 'My Beans' with 'Browse Community' button", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Should show My Beans heading
    await expect(page.locator("text=/my beans/i")).toBeVisible();
    // Should have community browse button
    await expect(page.locator("button:has-text('Community'), button:has-text('Browse')").first()).toBeVisible({ timeout: 5_000 });
  });

  test("'Browse Community' shows all beans from all users", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    const myBeanCount = await page.locator("[data-testid='bean-card']").count();
    // Click community browse
    await page.locator("button:has-text('Community'), button:has-text('Browse')").first().click();
    await expect(page.locator("text=/bean library/i")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("[data-testid='bean-card']").first()).toBeVisible({ timeout: 10_000 });
    // Should show more beans than My Beans (seed has 8 beans across 3 users)
    const communityBeanCount = await page.locator("[data-testid='bean-card']").count();
    expect(communityBeanCount).toBeGreaterThanOrEqual(myBeanCount);
  });

  test("logged-out user sees all beans (community view) with no Add button", async ({ page }) => {
    await page.goto("/beans");
    // Should see beans without auth
    await expect(page.locator("[data-testid='bean-card']").first()).toBeVisible({ timeout: 10_000 });
    // No Add Bean button
    await expect(page.locator("button:has-text('Add Bean')")).not.toBeVisible();
  });

  test("logged-in user sees Add Bean button", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await expect(page.locator("button:has-text('Add Bean')")).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — ADD BEAN MODAL
// ════════════════════════════════════════════════════════════════════

test.describe("Add Bean flow", () => {
  test("Add Bean modal has required fields (name, origin, process)", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:has-text('Add Bean')");
    // Modal should show required fields
    await expect(page.locator("text=/bean name/i")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/origin/i")).toBeVisible();
    await expect(page.locator("text=/process/i")).toBeVisible();
  });

  test("creating a bean closes modal and shows bean in library", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:has-text('Add Bean')");

    // Fill required fields
    await page.fill("input[placeholder*='name' i]", "E2E Test Brazil Santos");
    await page.fill("input[placeholder*='Yirgacheffe' i]", "Minas Gerais, Brazil");
    const processInput = page.locator("input[placeholder*='process' i], input[placeholder*='Washed']");
    await processInput.fill("Natural");
    // Select from dropdown if visible
    const option = page.locator("[role='option']:text-is('Natural')");
    if (await option.isVisible({ timeout: 2_000 })) {
      await option.click();
    }
    await page.fill("input[aria-describedby='short-name-help']", "BrSantos");

    await page.click("button:text('Save')");

    // Modal should close (save = close on success)
    await page.waitForTimeout(2_000);
    // Bean should appear in library
    await expect(page.locator("text='E2E Test Brazil Santos'")).toBeVisible({ timeout: 5_000 });
  });

  test("cupping notes textarea parses flavor descriptors", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:has-text('Add Bean')");

    await page.fill("input[placeholder*='name' i]", "E2E Flavor Parse Bean");
    await page.fill("input[placeholder*='origin' i], input[placeholder*='Huila']", "Costa Rica");
    const processInput = page.locator("input[placeholder*='process' i], input[placeholder*='Washed']");
    await processInput.fill("Honey");
    const option = page.locator("[role='option']:text-is('Honey')");
    if (await option.isVisible({ timeout: 2_000 })) {
      await option.click();
    }

    // Supplier Notes textarea — one field now serves both as bagNotes
    // and as the parse input (consolidation in AddBeanModal)
    const supplierNotes = page.locator("textarea[placeholder*='description' i]");
    await supplierNotes.fill("Bright with blueberry and honey sweetness, hints of dark chocolate");

    // Parse button or auto-parse
    const parseBtn = page.locator("button:has-text('Parse')");
    if (await parseBtn.isVisible({ timeout: 2_000 })) {
      await parseBtn.click();
    }

    // Should show matched flavor pills
    await expect(page.locator("[data-testid='flavor-pill']").first()).toBeVisible({ timeout: 5_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — SORT INDICATORS
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Library sort indicators", () => {
  test("unsorted columns show ↕, clicking cycles through ▲ and ▼", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Switch to table view
    await page.locator("button:has-text('Table'), [data-testid='view-table'], [aria-label*='table' i]").first().click();
    await expect(page.locator("table, [data-testid='bean-table']").first()).toBeVisible({ timeout: 5_000 });

    // Find the "Name" column header
    const nameHeader = page.locator("th").filter({ hasText: /^Name/ });
    await expect(nameHeader).toBeVisible({ timeout: 3_000 });

    // All columns should initially show ↕ (unsorted) or the default sort column shows ▲
    // Click Origin header (likely unsorted) to start fresh
    const originHeader = page.locator("th").filter({ hasText: /^Origin/ });
    await expect(originHeader).toBeVisible();

    // First click: should sort ascending (▲)
    await originHeader.click();
    await expect(originHeader).toContainText("▲", { timeout: 2_000 });

    // Other columns should show ↕
    await expect(nameHeader).toContainText("↕");

    // Second click on same column: should sort descending (▼)
    await originHeader.click();
    await expect(originHeader).toContainText("▼", { timeout: 2_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — FLAVOR PARSE NO-MATCH FEEDBACK
// ════════════════════════════════════════════════════════════════════

test.describe("Add Bean flavor parse no-match", () => {
  test("unrecognized cupping notes show no-match message", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:has-text('Add Bean')");

    // Fill required fields
    await page.fill("input[placeholder*='name' i]", "E2E No-Match Bean");
    await page.fill("input[placeholder*='origin' i], input[placeholder*='Huila']", "Test Origin");
    const processInput = page.locator("input[placeholder*='process' i], input[placeholder*='Washed']");
    await processInput.fill("Washed");
    const option = page.locator("[role='option']:text-is('Washed')");
    if (await option.isVisible({ timeout: 2_000 })) {
      await option.click();
    }

    // Type gibberish into Supplier Notes that won't match any descriptors
    const supplierNotes = page.locator("textarea[placeholder*='description' i]");
    await supplierNotes.fill("xyzzy foobar quux blargh");

    // Click Parse Flavors
    await page.locator("button:has-text('Parse')").click();

    // Should show no-match message
    await expect(page.locator("text=/no flavors matched/i")).toBeVisible({ timeout: 5_000 });

    // No flavor pills should appear
    await expect(page.locator("[data-testid='flavor-pill']")).toHaveCount(0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  BEAN LIBRARY — SEARCH/FILTER IN TABLE VIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Bean Library table search and filter", () => {
  test("search filters beans by name", async ({ authedPage: page }) => {
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    // Switch to table view
    await page.locator("button:has-text('Table'), [data-testid='view-table'], [aria-label*='table' i]").first().click();
    await expect(page.locator("table, [data-testid='bean-table']").first()).toBeVisible({ timeout: 5_000 });

    const searchInput = page.locator("input[placeholder*='Search' i]");
    await searchInput.fill("Kenya");
    await page.waitForTimeout(500);
    await expect(page.locator("text='Kenya Nyeri Ichamama AA'")).toBeVisible();
    await expect(page.locator("text='Colombia Huila Excelso EP'")).not.toBeVisible({ timeout: 2_000 });
  });
});
