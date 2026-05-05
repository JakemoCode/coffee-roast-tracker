import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BeanLibraryPage } from "../BeanLibraryPage";

const beanCacheStore: Record<string, Record<string, unknown>> = {};

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => [vi.fn()]),
  useFragment: vi.fn(({ from }: { from: { id: string } }) => ({
    data: beanCacheStore[from.id] ?? { id: from.id, name: "", origin: null, process: null, suggestedFlavors: [] },
    complete: true,
  })),
}));

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

import { useQuery } from "@apollo/client/react";
import { useAuthState } from "../../../lib/useAuthState";
import {
  MY_BEANS_QUERY,
  MY_ROASTS_QUERY,
  PUBLIC_BEANS_QUERY,
} from "../../../graphql/operations";

const mockUseQuery = vi.mocked(useQuery);
const mockUseAuthState = vi.mocked(useAuthState);

const mockMyBeans = {
  myBeans: [
    {
      id: "ub1",
      shortName: "ETH",
      notes: null,
      bean: {
        id: "b1",
        name: "Ethiopia Yirgacheffe",
        origin: "Ethiopia",
        process: "Washed",
        elevation: "1900",
        variety: "Heirloom",
        sourceUrl: null,
        bagNotes: null,
        score: 87,
        cropYear: null,
        suggestedFlavors: ["Blueberry", "Citrus"],
      },
    },
    {
      id: "ub2",
      shortName: null,
      notes: null,
      bean: {
        id: "b2",
        name: "Colombia Huila",
        origin: "Colombia",
        process: "Natural",
        elevation: null,
        variety: "Caturra",
        sourceUrl: null,
        bagNotes: null,
        score: null,
        cropYear: null,
        suggestedFlavors: null,
      },
    },
  ],
};

const mockMyRoasts = {
  myRoasts: [
    {
      id: "r1",
      roastDate: "2025-03-01",
      notes: null,
      developmentTime: 90,
      developmentPercent: 20,
      totalDuration: 660,
      firstCrackTemp: 198,
      roastEndTemp: 210,
      colourChangeTime: null,
      colourChangeTemp: null,
      firstCrackTime: null,
      roastEndTime: null,
      rating: 4,
      isPublic: false,
      bean: { id: "b1", name: "Ethiopia Yirgacheffe" },
      flavors: [],
      offFlavors: [],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BeanLibraryPage />
    </MemoryRouter>,
  );
}

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

function mockAuthenticatedWithBeans() {
  mockUseAuthState.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user1",
  } as ReturnType<typeof useAuthState>);

  populateBeanCache(mockMyBeans.myBeans.map((ub) => ub.bean));

  mockUseQuery.mockImplementation(((query: unknown) => {
    if (query === MY_BEANS_QUERY) {
      return { data: mockMyBeans, loading: false, error: undefined, refetch: vi.fn() };
    }
    if (query === MY_ROASTS_QUERY) {
      return { data: mockMyRoasts, loading: false, error: undefined, refetch: vi.fn() };
    }
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  }) as unknown as typeof useQuery);
}

function mockUnauthenticated() {
  mockUseAuthState.mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
  } as ReturnType<typeof useAuthState>);

  const publicBeans = [
    { id: "b1", name: "Ethiopia Yirgacheffe", origin: "Ethiopia", process: "Washed", variety: null, suggestedFlavors: null },
  ];
  populateBeanCache(publicBeans);

  mockUseQuery.mockImplementation(((query: unknown) => {
    if (query === PUBLIC_BEANS_QUERY) {
      return {
        data: { publicBeans },
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      };
    }
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  }) as unknown as typeof useQuery);
}

describe("BeanLibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(beanCacheStore)) {
      delete beanCacheStore[key];
    }
  });

  it("shows 'My Beans' heading when logged in", () => {
    mockAuthenticatedWithBeans();
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Beans");
  });

  it("shows 'Bean Library' heading when logged out", () => {
    mockUnauthenticated();
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bean Library");
  });

  it("shows bean cards when data loads", () => {
    mockAuthenticatedWithBeans();
    renderPage();
    const cards = screen.getAllByTestId("bean-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Colombia Huila")).toBeInTheDocument();
  });

  it("shows 'Add Bean' button when authenticated", () => {
    mockAuthenticatedWithBeans();
    renderPage();
    expect(screen.getByTestId("add-bean-btn")).toBeInTheDocument();
    expect(screen.getByTestId("add-bean-btn")).toHaveTextContent("+ Add Bean");
  });

  it("hides 'Add Bean' button when not authenticated", () => {
    mockUnauthenticated();
    renderPage();
    expect(screen.queryByTestId("add-bean-btn")).not.toBeInTheDocument();
  });

  it("view toggle switches between card and table view", async () => {
    const user = userEvent.setup();
    mockAuthenticatedWithBeans();
    renderPage();

    // Card view is default
    expect(screen.getByTestId("bean-card-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("bean-table")).not.toBeInTheDocument();

    // Switch to table view
    await user.click(screen.getByText("Table"));
    expect(screen.getByTestId("bean-table")).toBeInTheDocument();
    expect(screen.queryByTestId("bean-card-grid")).not.toBeInTheDocument();

    // Switch back to card view
    await user.click(screen.getByText("Cards"));
    expect(screen.getByTestId("bean-card-grid")).toBeInTheDocument();
  });

  it("shows loading skeleton while loading", () => {
    mockUseAuthState.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuthState>);

    mockUseQuery.mockImplementation((() => ({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    })) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("bean-library-loading")).toBeInTheDocument();
  });

  it("shows error state on error", () => {
    mockUseAuthState.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuthState>);

    mockUseQuery.mockImplementation(((query: unknown) => {
      if (query === MY_BEANS_QUERY) {
        return { data: undefined, loading: false, error: new Error("Network error"), refetch: vi.fn() };
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
    }) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("shows empty state when no beans exist", () => {
    mockUseAuthState.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuthState>);

    mockUseQuery.mockImplementation(((query: unknown) => {
      if (query === MY_BEANS_QUERY) {
        return { data: { myBeans: [] }, loading: false, error: undefined, refetch: vi.fn() };
      }
      if (query === MY_ROASTS_QUERY) {
        return { data: { myRoasts: [] }, loading: false, error: undefined, refetch: vi.fn() };
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
    }) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("Add your first bean or browse community beans")).toBeInTheDocument();
  });
});
