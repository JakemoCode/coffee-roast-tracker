import { describe, it, expect, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { graphql as mswGraphql, HttpResponse, delay } from "msw";
import { DashboardPage } from "../DashboardPage";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import { server } from "../../../../test/mocks/server";

/**
 * DashboardPage — real Apollo Client wired to MSW.
 *
 * Default MSW data (client/test/mocks/schema-handler.ts) returns two
 * Roasts: Ethiopia Yirgacheffe (rating 4) and Colombia Huila (rating null).
 * Tests that need a different shape override the handler via `server.use`.
 */

function renderDashboard() {
  return renderWithProviders(<DashboardPage />, { route: "/" });
}

describe("DashboardPage", () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it("shows the 'My Roasts' heading", async () => {
    renderDashboard();
    expect(
      await screen.findByRole("heading", { name: "My Roasts" }),
    ).toBeInTheDocument();
  });

  it("shows total roast count and average rating in stat chips", async () => {
    // Default MSW: 2 roasts, one rated 4 + one unrated → avg = 4.0.
    renderDashboard();
    const chips = await screen.findByTestId("stat-chips");
    // Scope to the chips region — bare "2" / "4.0" matches too broadly elsewhere.
    expect(within(chips).getByText("2")).toBeInTheDocument();
    expect(within(chips).getByText("4.0")).toBeInTheDocument();
  });

  it("shows the user's roasts in the table", async () => {
    renderDashboard();
    // Scope to the table so we don't match stat-chip text (e.g. "TOP BEAN").
    const table = await screen.findByTestId("roasts-table");
    expect(
      await within(table).findByText("Ethiopia Yirgacheffe"),
    ).toBeInTheDocument();
    expect(within(table).getByText("Colombia Huila")).toBeInTheDocument();
  });

  it("shows an empty-state CTA when the user has no roasts", async () => {
    server.use(
      mswGraphql.query("MyRoasts", () =>
        HttpResponse.json({ data: { myRoasts: [] } }),
      ),
    );
    renderDashboard();
    expect(await screen.findByText(/no roasts yet/i)).toBeInTheDocument();
  });

  it("shows an error state with retry when the roasts query fails", async () => {
    server.use(
      mswGraphql.query("MyRoasts", () =>
        HttpResponse.json({ errors: [{ message: "Unauthorized" }] }),
      ),
    );
    renderDashboard();
    expect(
      await screen.findByText(/failed to load roasts/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows a skeleton while roasts are loading", async () => {
    // Hold the response indefinitely so the component stays in loading.
    server.use(
      mswGraphql.query("MyRoasts", async () => {
        await delay("infinite");
        return HttpResponse.json({ data: { myRoasts: [] } });
      }),
    );
    renderDashboard();
    const skeletons = await screen.findAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
