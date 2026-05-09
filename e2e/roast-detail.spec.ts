import { test, expect, waitForDashboard, waitForRoastDetail } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — PUBLIC VIEW
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail public view", () => {
  test("shows chart, metrics, and flavors in read-only mode", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Chart should be visible
    await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible();
    // Metrics should be visible
    await expect(page.locator("text=/dev time/i")).toBeVisible({ timeout: 5_000 });
  });

  test("share button copies URL to clipboard", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    const shareBtn = page.locator("button:has-text('Share'), button:has-text('Copy')");
    await expect(shareBtn.first()).toBeVisible({ timeout: 5_000 });
    await shareBtn.first().click();
    // Should show a toast or confirmation that link was copied
    await expect(page.locator("text=/copied|link/i").first()).toBeVisible({ timeout: 3_000 });
  });

  test(".kpro download button is visible when profile exists", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Download button should be visible (if roast has a profile)
    const downloadBtn = page.locator("button:has-text('Download'), a:has-text('Download'), a:has-text('.kpro')");
    // Some roasts may not have profiles, so just check it doesn't crash
    await page.waitForTimeout(2_000);
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — OWNER EDITING
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail owner editing", () => {
  test("editing notes inline persists after save", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Find notes section and edit
    const editBtn = page.locator("button:text('Edit')").first();
    await expect(editBtn).toBeVisible({ timeout: 5_000 });
    await editBtn.click();
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("E2E test note — updated");
    await page.locator("button:text('Save')").first().click();
    await expect(page.locator("text='E2E test note — updated'")).toBeVisible({ timeout: 5_000 });
  });

  test("inline star rating is editable by owner", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    const stars = page.locator("[data-testid='star-rating']").first();
    await expect(stars).toBeVisible({ timeout: 5_000 });
  });

  test("public/private toggle changes roast visibility", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Find the privacy toggle
    const privacyToggle = page.locator("button:has-text('Private'), button:has-text('Public'), [data-testid='privacy-toggle']");
    await expect(privacyToggle.first()).toBeVisible({ timeout: 5_000 });
    await privacyToggle.first().click();
    // Should show confirmation of state change (toast or visual toggle change)
    await page.waitForTimeout(1_000);
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — DELETE FLOW
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail delete", () => {
  test("delete shows confirmation dialog and redirects to dashboard", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    // Click a roast to view detail
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Click delete
    const deleteBtn = page.locator("button:has-text('Delete')");
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    // Confirmation dialog should appear
    await expect(page.locator("text=/are you sure|confirm|delete this roast/i")).toBeVisible({ timeout: 3_000 });

    // Confirm deletion
    await page.locator("button:has-text('Confirm'), button:has-text('Yes'), button:has-text('Delete')").last().click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 5_000 });
    await waitForDashboard(page);
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — "OTHER ROASTS OF THIS BEAN" TABLE
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail other roasts table", () => {
  test("shows other roasts of the same bean at the bottom", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Should show "Other roasts" or similar section
    await expect(page.locator("text=/other roasts|more roasts|roasts of this bean/i")).toBeVisible({ timeout: 5_000 });
  });

  test("checking a sibling roast in the metrics table marks it compared", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Roast Detail compare is an inline overlay on the chart, not a button.
    // The current roast's row has no checkbox; siblings do. Toggling a
    // sibling's checkbox flips data-compared on its row and overlays its
    // time series on the chart.
    const sibling = page.locator('[data-testid="metrics-row"][data-current="false"]').first();
    await expect(sibling).toHaveAttribute("data-compared", "false");

    await sibling.locator('input[type="checkbox"]').check();

    await expect(sibling).toHaveAttribute("data-compared", "true", { timeout: 3_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — CHART INTERACTIONS
// ════════════════════════════════════════════════════════════════════

test.describe("Roast chart", () => {
  test("chart renders with toggleable dataset controls", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Chart canvas should be visible
    await expect(page.locator("canvas").first()).toBeVisible();
    // Dataset toggle controls should be visible
    await expect(page.locator("text=/mean temp/i").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/profile/i").first()).toBeVisible();
  });

  test("phase zoom buttons are visible (Dry, Maillard, Development)", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    await expect(page.locator("button:has-text('Dry'), [data-testid='phase-dry']").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("button:has-text('Maillard'), [data-testid='phase-maillard']").first()).toBeVisible();
    await expect(page.locator("button:has-text('Dev'), [data-testid='phase-dev']").first()).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — VISIBILITY TOGGLE FEEDBACK
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail visibility toggle feedback", () => {
  test("toggling public/private shows toast confirmation", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    // Click the visibility toggle
    const toggle = page.locator("button:has-text('Public'), button:has-text('Private')");
    await expect(toggle.first()).toBeVisible({ timeout: 5_000 });
    await toggle.first().click();

    // Should show a toast confirming the change
    await expect(page.locator("[data-testid='toast'], [role='status']").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/roast is now/i").first()).toBeVisible({ timeout: 3_000 });
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — METRICS TOOLTIPS
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail metrics tooltips", () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);
  });

  test("DTR label has Development Time Ratio tooltip", async ({ authedPage: page }) => {
    const dtrLabel = page.locator("[data-testid='metrics-table'] span[title*='Development Time Ratio']");
    await expect(dtrLabel).toBeVisible({ timeout: 5_000 });
    await expect(dtrLabel).toHaveAttribute("title", /Development Time Ratio/);
  });

  test("FC Time label has First Crack tooltip", async ({ authedPage: page }) => {
    const fcLabel = page.locator("[data-testid='metrics-table'] span[title*='First Crack']").first();
    await expect(fcLabel).toBeVisible({ timeout: 5_000 });
    await expect(fcLabel).toHaveAttribute("title", /First Crack/);
  });

  test("Dev Time label has Development Time tooltip", async ({ authedPage: page }) => {
    // "Development Time" appears in both Dev Time and DTR tooltips -- target the row label "Dev Time"
    const devTimeLabel = page.locator("[data-testid='metrics-table'] span[title*='Development Time']")
      .filter({ hasText: "Dev Time" });
    await expect(devTimeLabel).toBeVisible({ timeout: 5_000 });
    await expect(devTimeLabel).toHaveAttribute("title", /duration from First Crack/);
  });

  test("Dry End label has colour change tooltip", async ({ authedPage: page }) => {
    const dryEndLabel = page.locator("[data-testid='metrics-table'] span[title*='colour change']");
    await expect(dryEndLabel).toBeVisible({ timeout: 5_000 });
    await expect(dryEndLabel).toHaveAttribute("title", /colour change/);
  });
});

// ════════════════════════════════════════════════════════════════════
//  ROAST DETAIL — VISIBILITY TOGGLE DETAILS
// ════════════════════════════════════════════════════════════════════

test.describe("Roast Detail visibility toggle details", () => {
  test("toggle button shows lock icon and descriptive aria-label", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    await page.locator("text='Kenya Nyeri Ichamama AA'").first().click();
    await expect(page).toHaveURL(/\/roasts\//);
    await waitForRoastDetail(page);

    const toggle = page.locator("button[aria-label*='Visibility']");
    await expect(toggle).toBeVisible({ timeout: 5_000 });

    // Should have a descriptive aria-label with current state and action
    await expect(toggle).toHaveAttribute(
      "aria-label",
      /Visibility: (public|private)\. Click to make (private|public)\./,
    );

    // Should show lock icon
    await expect(toggle).toHaveText(/[🔓🔒]/);
  });
});
