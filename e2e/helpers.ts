import { test as base, expect, type Page } from "@playwright/test";

/**
 * Custom test fixture that injects the E2E auth token into every request.
 * The server recognizes "Bearer e2e-test-token" when E2E_TEST_USER_ID is set
 * and skips Clerk verification.
 *
 * Also intercepts Clerk's client-side checks so the React app renders
 * authenticated UI without a real Clerk session.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    // Set the E2E auth flag so useAuthState() treats this as authenticated
    await page.addInitScript(() => {
      (window as any).__clerk_frontend_api = "clerk.test.local";
      (window as any).__e2e_authed = true;
    });

    // Intercept all GraphQL requests and add the E2E auth header
    await page.route("**/graphql", async (route) => {
      const headers = {
        ...route.request().headers(),
        authorization: "Bearer e2e-test-token",
      };
      await route.continue({ headers });
    });

    // Mock Clerk API calls to return authenticated state
    await page.route("**/clerk**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ client: null }),
      });
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";

/** Wait for the landing page to load (community stats visible). */
export async function waitForLanding(page: Page) {
  await expect(page.locator("text=/\\d+ roasts? logged/i")).toBeVisible({ timeout: 10_000 });
}

/** Wait for the dashboard page to finish loading data. */
export async function waitForDashboard(page: Page) {
  await expect(page.locator("h1")).toContainText("My Roasts", { timeout: 10_000 });
  // Wait for either the roasts table to populate or the empty state to render.
  // Without this, tests that count rows/checkboxes race the Apollo query.
  await expect(
    page.locator(
      "[data-testid='roast-row'], text=/upload.*first roast|no roasts/i",
    ).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Wait for the bean library page to finish loading. */
export async function waitForBeanLibrary(page: Page) {
  await expect(page.locator("h1")).toContainText(/Beans|Bean Library|Bean Catalog/i, { timeout: 10_000 });
}

/** Wait for a bean detail page to load. */
export async function waitForBeanDetail(page: Page) {
  await expect(page.locator("[data-testid='bean-detail'], h1, h2").first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Wait for the roast history table on Bean Detail to populate (or the
 * empty state to render). Use after navigating to a bean before asserting
 * on or clicking a roast row.
 */
export async function waitForBeanRoastsLoaded(page: Page) {
  await expect(
    page.locator(
      "[data-testid='roast-history'] [data-testid='roast-row'], [data-testid='no-roasts']",
    ).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Wait for a roast detail page to load. */
export async function waitForRoastDetail(page: Page) {
  await expect(page.locator("canvas, [data-testid='roast-chart']").first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Override the E2E user for subsequent GraphQL requests.
 * Pass a seed clerkId (e.g. "clerk_seed_dave_004") — the server
 * resolves it to the internal user ID via x-e2e-clerk-id header.
 */
export async function switchE2eUser(page: Page, clerkId: string) {
  await page.route("**/graphql", async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: "Bearer e2e-test-token",
      "x-e2e-clerk-id": clerkId,
    };
    await route.continue({ headers });
  });
}
