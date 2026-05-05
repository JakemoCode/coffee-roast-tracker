import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "../LandingPage";
import { COMMUNITY_STATS_QUERY, PUBLIC_BEANS_QUERY } from "../../../graphql/operations";

const beanCacheStore: Record<string, Record<string, unknown>> = {};

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useFragment: vi.fn(({ from }: { from: { id: string } }) => ({
    data: beanCacheStore[from.id] ?? { id: from.id, name: "", origin: null, process: null, suggestedFlavors: [] },
    complete: true,
  })),
}));

import { useQuery } from "@apollo/client/react";

const mockUseQuery = vi.mocked(useQuery);

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

const mockStats = {
  communityStats: {
    totalRoasts: 142,
    totalBeans: 37,
  },
};

const mockBeans = {
  publicBeans: [
    { id: "b1", name: "Ethiopia Yirgacheffe", origin: "Ethiopia", process: "Washed", variety: null, suggestedFlavors: null },
    { id: "b2", name: "Colombia Huila", origin: "Colombia", process: "Natural", variety: null, suggestedFlavors: null },
  ],
};

const refetchFn = vi.fn();

function populateBeanCache(beans: Array<{ id: string; name: string; origin: string | null; process: string | null; suggestedFlavors: string[] | null }>) {
  for (const bean of beans) {
    beanCacheStore[bean.id] = {
      __typename: "Bean",
      id: bean.id,
      name: bean.name,
      origin: bean.origin,
      process: bean.process,
      suggestedFlavors: bean.suggestedFlavors ?? [],
    };
  }
}

function mockQueryResults(statsResult: unknown, beansResult: unknown) {
  // Populate bean cache for useFragment reads
  const beansData = (beansResult as { data?: { publicBeans?: Array<{ id: string; name: string; origin: string | null; process: string | null; suggestedFlavors: string[] | null }> } })?.data?.publicBeans;
  if (beansData) {
    populateBeanCache(beansData);
  }

  mockUseQuery.mockImplementation(((query: unknown) => {
    if (query === COMMUNITY_STATS_QUERY) return statsResult;
    if (query === PUBLIC_BEANS_QUERY) return beansResult;
    return { data: undefined, loading: false, error: undefined, refetch: refetchFn };
  }) as typeof useQuery);
}

function loadedResult(data: unknown) {
  return { data, loading: false, error: undefined, refetch: refetchFn };
}

function loadingResult() {
  return { data: undefined, loading: true, error: undefined, refetch: refetchFn };
}

function errorResult() {
  return { data: undefined, loading: false, error: new Error("Network error"), refetch: refetchFn };
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(beanCacheStore)) {
      delete beanCacheStore[key];
    }
  });

  it("shows community stats when data loads", () => {
    mockQueryResults(loadedResult(mockStats), loadedResult(mockBeans));
    renderLanding();

    expect(screen.getByTestId("community-stats")).toBeInTheDocument();
    expect(screen.getByTestId("stat-roasts")).toHaveTextContent("142");
    expect(screen.getByTestId("stat-beans")).toHaveTextContent("37");
    expect(screen.getByText("roasts logged")).toBeInTheDocument();
    expect(screen.getByText("beans tracked")).toBeInTheDocument();
  });

  it("shows popular beans as BeanCard components", () => {
    mockQueryResults(loadedResult(mockStats), loadedResult(mockBeans));
    renderLanding();

    expect(screen.getByTestId("popular-beans")).toBeInTheDocument();
    expect(screen.getByText("Popular Beans")).toBeInTheDocument();
    const beanCards = screen.getAllByTestId("bean-card");
    expect(beanCards).toHaveLength(2);
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Colombia Huila")).toBeInTheDocument();
  });

  it("shows sign-up CTA", () => {
    mockQueryResults(loadedResult(mockStats), loadedResult(mockBeans));
    renderLanding();

    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
    expect(screen.getByText("Track your own roasts — sign up free!")).toBeInTheDocument();
    const signUpLink = screen.getByTestId("sign-up-link");
    expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  it("shows loading skeletons while loading", () => {
    mockQueryResults(loadingResult(), loadingResult());
    renderLanding();

    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
    expect(screen.getByTestId("beans-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("community-stats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("popular-beans")).not.toBeInTheDocument();
  });

  it("shows error state on error", () => {
    mockQueryResults(errorResult(), errorResult());
    renderLanding();

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Failed to load community data")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows empty state when no beans exist", () => {
    mockQueryResults(loadedResult(mockStats), loadedResult({ publicBeans: [] }));
    renderLanding();

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Be the first to log a roast!")).toBeInTheDocument();
  });

  it("renders the hero section with title", () => {
    mockQueryResults(loadingResult(), loadingResult());
    renderLanding();

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByText("Coffee Roast Tracker")).toBeInTheDocument();
  });
});
