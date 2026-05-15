import { describe, it, expect, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { graphql as mswGraphql, HttpResponse, delay } from "msw";
import { LandingPage } from "../LandingPage";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import { server } from "../../../../test/mocks/server";

/**
 * LandingPage — real Apollo Client wired to MSW.
 *
 * Default MSW (client/test/mocks/schema-handler.ts) returns:
 *   communityStats: { totalRoasts: 42, totalBeans: 15 }
 *   publicBeans: [Ethiopia Yirgacheffe, Colombia Huila]
 * Tests that need a different shape override via `server.use`.
 */

function renderLanding() {
  return renderWithProviders(<LandingPage />, { route: "/" });
}

describe("LandingPage", () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it("renders the hero section with the app title", async () => {
    renderLanding();
    expect(
      await screen.findByRole("heading", { name: "Coffee Roast Tracker" }),
    ).toBeInTheDocument();
  });

  it("shows community stats — total roasts and total beans", async () => {
    // Default MSW: communityStats = { totalRoasts: 42, totalBeans: 15 }.
    renderLanding();
    const stats = await screen.findByTestId("community-stats");
    expect(within(stats).getByText("42")).toBeInTheDocument();
    expect(within(stats).getByText("15")).toBeInTheDocument();
    expect(within(stats).getByText(/roasts logged/i)).toBeInTheDocument();
    expect(within(stats).getByText(/beans tracked/i)).toBeInTheDocument();
  });

  it("renders a card per public bean in the Popular Beans section", async () => {
    // Default MSW: publicBeans = [Ethiopia Yirgacheffe, Colombia Huila].
    // BeanCard's bean-name rendering is tested in BeanCard's own test
    // (it uses useFragment which doesn't populate under the test client's
    // no-cache policy). At the page level we just verify the section
    // wires the right number of cards to the query result.
    renderLanding();
    const popular = await screen.findByTestId("popular-beans");
    expect(within(popular).getByRole("heading", { name: /popular beans/i }))
      .toBeInTheDocument();
    expect(within(popular).getAllByTestId("bean-card")).toHaveLength(2);
  });

  it("shows the sign-up CTA linking to /sign-up", async () => {
    renderLanding();
    const cta = await screen.findByTestId("cta-section");
    expect(
      within(cta).getByRole("heading", { name: /sign up free/i }),
    ).toBeInTheDocument();
    expect(within(cta).getByRole("link", { name: /get started/i }))
      .toHaveAttribute("href", "/sign-up");
  });

  it("shows skeletons while community data is loading", async () => {
    // Both queries hang — Landing should render loading placeholders.
    server.use(
      mswGraphql.query("CommunityStats", async () => {
        await delay("infinite");
        return HttpResponse.json({ data: null });
      }),
      mswGraphql.query("PublicBeans", async () => {
        await delay("infinite");
        return HttpResponse.json({ data: null });
      }),
    );
    renderLanding();
    expect(await screen.findByTestId("stats-loading")).toBeInTheDocument();
    expect(screen.getByTestId("beans-loading")).toBeInTheDocument();
    // Real data sections should be absent during loading.
    expect(screen.queryByTestId("community-stats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("popular-beans")).not.toBeInTheDocument();
  });

  it("shows an error state with retry when community data fails", async () => {
    server.use(
      mswGraphql.query("CommunityStats", () =>
        HttpResponse.json({ errors: [{ message: "Network error" }] }),
      ),
      mswGraphql.query("PublicBeans", () =>
        HttpResponse.json({ errors: [{ message: "Network error" }] }),
      ),
    );
    renderLanding();
    expect(
      await screen.findByText(/failed to load community data/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows an empty-state CTA when no public beans exist yet", async () => {
    server.use(
      mswGraphql.query("PublicBeans", () =>
        HttpResponse.json({ data: { publicBeans: [] } }),
      ),
    );
    renderLanding();
    expect(
      await screen.findByText(/be the first to log a roast/i),
    ).toBeInTheDocument();
  });
});
