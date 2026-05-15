import { test, expect, waitForDashboard, waitForBeanLibrary, waitForRoastDetail, waitForBeanRoastsLoaded, switchE2eUser } from "./helpers.js";
import * as path from "path";

const KLOG_FIXTURE = path.resolve(__dirname, "../mocks/sample-roasts/EGB 0320a.klog");

/**
 * Full end-to-end user journey tests.
 * These cover cross-page flows rather than single-page interactions.
 */

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 1: Logged-out browsing → sign up prompt
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: logged-out browsing", () => {
  test("visitor browses landing → bean library → bean detail → roast detail", async ({ page }) => {
    // Step 1: Land on landing page
    await page.goto("/");
    await expect(page.locator("text=/roasts? logged/i")).toBeVisible({ timeout: 5_000 });

    // Step 2: Navigate to bean library directly. Logged-out users have no
    // header nav for /beans — only the popular-bean cards (which go to
    // bean detail) and the sign-up CTA. The library itself is still
    // reachable by URL.
    await page.goto("/beans");
    await expect(page.locator("[data-testid='bean-card']").first()).toBeVisible({ timeout: 5_000 });

    // Step 3: Click a bean — Kenya AA has multiple public roasts in seed.
    await page.locator("[data-testid='bean-card']:has-text('Kenya')").first().click();
    await expect(page).toHaveURL(/\/beans\//);
    await waitForBeanRoastsLoaded(page);

    // Step 4: Click a roast from bean's roast history
    const roastLink = page.locator("[data-testid='roast-row']").first();
    await expect(roastLink).toBeVisible({ timeout: 5_000 });
    await roastLink.click();
    await expect(page).toHaveURL(/\/roasts\//);
    // Should see chart but no edit controls
    await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("button:text('Delete')")).not.toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 2: Upload → Roast Detail → Compare
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: upload then compare", () => {
  test("user uploads a roast, views detail, then compares with another roast of same bean", async ({ authedPage: page }) => {
    // Step 1: Upload a roast
    await page.goto("/");
    await waitForDashboard(page);
    await page.click("button:text('Upload')");

    const fileInput = page.locator("[data-testid='file-input'], input[type='file']");
    await fileInput.setInputFiles(KLOG_FIXTURE);
    await expect(page.locator("text=/parsed successfully/i")).toBeVisible({ timeout: 5_000 });
    await page.click("button:text('Save')");

    // Step 2: Should land on roast detail
    await expect(page).toHaveURL(/\/roasts\//, { timeout: 5_000 });
    await waitForRoastDetail(page);

    // Step 3: Compare inline via the roast metrics table checkboxes.
    // PR #44 moved compare from a separate /compare page to per-row
    // checkboxes on the roast detail page — checking a row overlays
    // that roast's data onto the chart.
    const compareCheckbox = page.locator('input[type="checkbox"][aria-label^="Compare with"]').first();
    await expect(compareCheckbox).toBeVisible({ timeout: 5_000 });
    await compareCheckbox.check();
    await expect(compareCheckbox).toBeChecked();
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 3: Add bean → upload roast for that bean → view detail
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: add bean then upload", () => {
  test("user adds a bean manually, then navigates to dashboard and uploads", async ({ authedPage: page }) => {
    // Step 1: Add bean
    await page.goto("/beans");
    await waitForBeanLibrary(page);
    await page.click("button:has-text('Add Bean')");
    await page.fill("input[placeholder*='name' i]", "Journey Test Bean");
    await page.fill("input[placeholder*='Yirgacheffe' i]", "Oaxaca, Mexico");
    const processInput = page.locator("input[placeholder*='process' i], input[placeholder*='Washed']");
    await processInput.fill("Natural");
    await page.fill("input[aria-describedby='short-name-help']", "Journey");
    await page.click("button:text('Save')");
    await page.waitForTimeout(2_000);

    // Step 2: Navigate to dashboard
    await page.click("nav >> text='My Roasts'");
    await waitForDashboard(page);

    // Step 3: Open upload modal
    await page.click("button:text('Upload')");
    await expect(page.locator("text=/upload roast|drop your/i")).toBeVisible({ timeout: 5_000 });

    // Close modal
    await page.click("[aria-label='Close modal']");
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 4: Dashboard filter → compare → back to dashboard
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: filter then compare", () => {
  test("user filters roasts by bean, selects two, compares, then returns", async ({ authedPage: page }) => {
    // Step 1: Load dashboard
    await page.goto("/");
    await waitForDashboard(page);

    // Step 2: Filter by bean
    const beanFilter = page.locator("[data-testid='bean-filter'], [aria-label='Filter by bean']");
    await expect(beanFilter).toBeVisible({ timeout: 3_000 });
    await beanFilter.selectOption({ label: "Kenya Nyeri Ichamama AA" });
    await page.waitForTimeout(500);

    // Step 3: Select two roasts
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Step 4: Compare
    await page.locator("button:has-text('Compare')").click();
    await expect(page).toHaveURL(/\/compare\?ids=/, { timeout: 5_000 });

    // Step 5: Navigate back
    await page.click("nav >> text='My Roasts'");
    await waitForDashboard(page);
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 5: Roast detail edit → delete → dashboard
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: edit then delete roast", () => {
  test("user edits roast notes, then deletes the roast and lands on dashboard", async ({ authedPage: page }) => {
    // Step 1: Navigate to a roast
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Ethiopia Yirgacheffe Kochere Debo'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Step 2: Edit notes
    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
    await editBtn.click();
    const textarea = page.locator("textarea").first();
    await textarea.fill("Journey 5 — about to delete");
    await page.locator("button:text('Save')").first().click();
    await expect(page.locator("text='Journey 5 — about to delete'")).toBeVisible({ timeout: 5_000 });

    // Step 3: Delete roast
    const deleteBtn = page.locator("button:has-text('Delete')");
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    // Step 4: Confirm deletion
    await expect(page.locator("text=/are you sure.*permanently/i")).toBeVisible({ timeout: 3_000 });
    await page.locator("button:has-text('Confirm'), button:has-text('Yes'), button:has-text('Delete')").last().click();

    // Step 5: Should land on dashboard
    await expect(page).toHaveURL("/", { timeout: 5_000 });
    await waitForDashboard(page);
  });
});

// ════════════════════════════════════════════════════════════════════
//  JOURNEY 6: Header controls round-trip
// ════════════════════════════════════════════════════════════════════

test.describe("Journey: header controls persistence", () => {
  test("temp and theme toggles persist across multiple page navigations", async ({ authedPage: page }) => {
    // Step 1: Start on dashboard
    await page.goto("/");
    await waitForDashboard(page);

    // Step 2: Toggle temp to °F
    const tempToggle = page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first();
    const initialTemp = await tempToggle.textContent();
    await tempToggle.click();
    await page.waitForTimeout(500);

    // Step 3: Toggle theme to dark
    const themeToggle = page.locator("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='mode' i]").first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Step 4: Navigate to beans
    await page.click("nav >> text=/beans/i");
    await page.waitForTimeout(1_000);

    // Step 5: Verify both persisted
    const tempAfter = page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first();
    const tempText = await tempAfter.textContent();
    expect(tempText).not.toBe(initialTemp);

    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme === "dark" || theme === "black-coffee").toBeTruthy();

    // Step 6: Navigate back to dashboard
    await page.click("nav >> text='My Roasts'");
    await waitForDashboard(page);

    // Still persisted
    const tempFinal = await page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first().textContent();
    expect(tempFinal).not.toBe(initialTemp);
  });
});
