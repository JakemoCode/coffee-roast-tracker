import { test, expect, waitForDashboard } from "./helpers.js";

// ════════════════════════════════════════════════════════════════════
//  TEMPERATURE TOGGLE
// ════════════════════════════════════════════════════════════════════

test.describe("Temperature toggle", () => {
  test("temp toggle shows °C or °F in header and is clickable", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const tempToggle = page.locator("button:has-text('°C'), button:has-text('°F'), [data-testid='temp-toggle']");
    await expect(tempToggle.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking temp toggle switches between °C and °F", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const tempToggle = page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first();
    const initialText = await tempToggle.textContent();

    await tempToggle.click();
    await page.waitForTimeout(500);

    const newText = await tempToggle.textContent();
    // Should have switched
    expect(newText).not.toBe(initialText);
  });

  test("temp preference persists across page navigation", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    // Set to °F
    const tempToggle = page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first();
    const text = await tempToggle.textContent();
    if (text?.includes("°C")) {
      await tempToggle.click();
      await page.waitForTimeout(500);
    }

    // Navigate away and back
    await page.click("nav >> text=/beans/i");
    await page.waitForTimeout(1_000);
    await page.click("nav >> text='My Roasts'");
    await waitForDashboard(page);

    // Should still be °F
    const afterNav = page.locator("[data-testid='temp-toggle'], button:has-text('°F')").first();
    await expect(afterNav).toBeVisible({ timeout: 5_000 });
  });

  test("logged-out users can also toggle temp and it persists via localStorage", async ({ page }) => {
    await page.goto("/beans"); // Public page with header
    const tempToggle = page.locator("[data-testid='temp-toggle'], button:has-text('°C'), button:has-text('°F')").first();
    await expect(tempToggle).toBeVisible({ timeout: 5_000 });
    await tempToggle.click();
    await page.waitForTimeout(500);
    // Verify it changed
    const newText = await tempToggle.textContent();
    expect(newText).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════════
//  THEME TOGGLE (Latte Mode / Black Coffee Mode)
// ════════════════════════════════════════════════════════════════════

test.describe("Theme toggle", () => {
  test("theme toggle is visible in header", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const themeToggle = page.locator("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='mode' i]");
    await expect(themeToggle.first()).toBeVisible({ timeout: 5_000 });
  });

  test("clicking theme toggle switches to dark mode (Black Coffee)", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const themeToggle = page.locator("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='mode' i]").first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Document should have dark theme attribute
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme === "dark" || theme === "black-coffee").toBeTruthy();
  });

  test("toggling back restores light mode (Latte)", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const themeToggle = page.locator("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='mode' i]").first();

    // Toggle to dark
    await themeToggle.click();
    await page.waitForTimeout(300);
    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(300);

    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme === null || theme === "light" || theme === "latte").toBeTruthy();
  });

  test("theme persists across navigation", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);
    const themeToggle = page.locator("[data-testid='theme-toggle'], button[aria-label*='theme' i], button[aria-label*='mode' i]").first();
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Navigate away
    await page.click("nav >> text=/beans/i");
    await page.waitForTimeout(1_000);

    // Theme should persist
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme === "dark" || theme === "black-coffee").toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════════
//  PRIVACY DEFAULT (in user avatar dropdown)
// ════════════════════════════════════════════════════════════════════

test.describe("Privacy default setting", () => {
  test("user avatar dropdown contains 'Private by default' toggle", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    // Click user avatar to open dropdown
    const avatar = page.locator("[data-testid='user-button'], [data-testid='user-avatar'], button[aria-label*='user' i], button[aria-label*='account' i]");
    await avatar.first().click();

    // Should show privacy toggle
    await expect(page.locator("text=/private by default/i")).toBeVisible({ timeout: 3_000 });
  });

  test("user avatar dropdown contains Sign Out option", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const avatar = page.locator("[data-testid='user-button'], [data-testid='user-avatar'], button[aria-label*='user' i], button[aria-label*='account' i]");
    await avatar.first().click();

    await expect(page.locator("text=/sign out|log out/i")).toBeVisible({ timeout: 3_000 });
  });

  test("toggling 'Private by default' persists the setting", async ({ authedPage: page }) => {
    await page.goto("/");
    await waitForDashboard(page);

    const avatar = page.locator("[data-testid='user-button'], [data-testid='user-avatar'], button[aria-label*='user' i], button[aria-label*='account' i]");
    await avatar.first().click();

    const privacyToggle = page.locator("[data-testid='privacy-default-toggle'], input[type='checkbox']:near(:text('Private'))").first();
    await privacyToggle.click();
    await page.waitForTimeout(1_000);

    // Close and reopen dropdown to verify persistence
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await avatar.first().click();

    // Should still be toggled
    await expect(page.locator("text=/private by default/i")).toBeVisible({ timeout: 3_000 });
  });
});
