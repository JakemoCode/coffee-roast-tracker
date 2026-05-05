import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BeanDetailPage } from "../BeanDetailPage";

const { mockRoastLookup } = vi.hoisted(() => {
  const mockRoastLookup = new Map<string, Record<string, unknown>>();
  return { mockRoastLookup };
});

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => [vi.fn()]),
  useLazyQuery: vi.fn(() => [vi.fn().mockResolvedValue({ data: { parseSupplierNotes: [] } }), { loading: false }]),
  useFragment: (opts: { from: { id: string } }) => ({
    data: mockRoastLookup.get(opts.from.id) ?? { id: opts.from.id, bean: { name: "" } },
    complete: true,
  }),
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: "bean1" })),
  };
});

vi.mock("../../../providers/TempContext", () => ({
  useTempUnit: () => ({ tempUnit: "CELSIUS", toggleTempUnit: vi.fn() }),
}));

vi.mock("../../../components/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { useQuery } from "@apollo/client/react";
import { useAuth } from "@clerk/clerk-react";
import {
  PUBLIC_BEAN_QUERY,
  MY_BEANS_QUERY,
  ROASTS_BY_BEAN_QUERY,
  PUBLIC_ROASTS_QUERY,
} from "../../../graphql/operations";

const mockUseQuery = vi.mocked(useQuery);
const mockUseAuth = vi.mocked(useAuth);

const mockBean = {
  bean: {
    id: "bean1",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Washed",
    elevation: "1900 MASL",
    variety: "Heirloom",
    sourceUrl: "https://example.com/bean",
    bagNotes: "Fruity and floral",
    score: 87,
    cropYear: "2024",
    suggestedFlavors: ["Blueberry", "Citrus", "Floral"],
  },
};

const mockMyBeans = {
  myBeans: [
    {
      id: "ub1",
      shortName: "ETH",
      notes: "Great bean",
      bean: {
        id: "bean1",
        name: "Ethiopia Yirgacheffe",
        origin: "Ethiopia",
        process: "Washed",
        elevation: "1900 MASL",
        variety: "Heirloom",
        sourceUrl: "https://example.com/bean",
        bagNotes: "Fruity and floral",
        score: 87,
        cropYear: "2024",
        suggestedFlavors: ["Blueberry", "Citrus", "Floral"],
      },
    },
  ],
};

const mockRoasts = {
  roastsByBean: [
    {
      id: "r1",
      roastDate: "2025-03-01",
      notes: "Good roast",
      developmentTime: 90,
      developmentPercent: 20.5,
      totalDuration: 660,
      firstCrackTemp: 198,
      roastEndTemp: 210,
      rating: 4,
      bean: { id: "bean1", name: "Ethiopia Yirgacheffe" },
      flavors: [],
      offFlavors: [],
    },
    {
      id: "r2",
      roastDate: "2025-03-10",
      notes: null,
      developmentTime: 85,
      developmentPercent: 19.2,
      totalDuration: 640,
      firstCrackTemp: 196,
      roastEndTemp: 208,
      rating: 5,
      bean: { id: "bean1", name: "Ethiopia Yirgacheffe" },
      flavors: [],
      offFlavors: [],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BeanDetailPage />
    </MemoryRouter>,
  );
}

function mockOwner() {
  mockUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user1",
  } as ReturnType<typeof useAuth>);

  mockUseQuery.mockImplementation(((query: unknown) => {
    if (query === PUBLIC_BEAN_QUERY) {
      return { data: mockBean, loading: false, error: undefined, refetch: vi.fn() };
    }
    if (query === MY_BEANS_QUERY) {
      return { data: mockMyBeans, loading: false, error: undefined, refetch: vi.fn() };
    }
    if (query === ROASTS_BY_BEAN_QUERY) {
      return { data: mockRoasts, loading: false, error: undefined, refetch: vi.fn() };
    }
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  }) as unknown as typeof useQuery);
}

function mockNonOwner() {
  mockUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "other-user",
  } as ReturnType<typeof useAuth>);

  mockUseQuery.mockImplementation(((query: unknown) => {
    if (query === PUBLIC_BEAN_QUERY) {
      return { data: mockBean, loading: false, error: undefined, refetch: vi.fn() };
    }
    if (query === MY_BEANS_QUERY) {
      return { data: { myBeans: [] }, loading: false, error: undefined, refetch: vi.fn() };
    }
    if (query === PUBLIC_ROASTS_QUERY) {
      return {
        data: {
          publicRoasts: [
            {
              id: "pr1",
              roastDate: "2025-03-05",
              rating: 3,
              developmentTime: 80,
              developmentPercent: 18,
              totalDuration: 620,
              firstCrackTemp: 195,
              roastEndTemp: 205,
              bean: { id: "bean1", name: "Ethiopia Yirgacheffe" },
            },
          ],
        },
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      };
    }
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  }) as unknown as typeof useQuery);
}

describe("BeanDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoastLookup.clear();
    for (const r of mockRoasts.roastsByBean) {
      mockRoastLookup.set(r.id, r);
    }
    // Also add the public roast used in non-owner tests
    mockRoastLookup.set("pr1", {
      id: "pr1",
      roastDate: "2025-03-05",
      rating: 3,
      developmentTime: 80,
      developmentPercent: 18,
      totalDuration: 620,
      firstCrackTemp: 195,
      roastEndTemp: 205,
      bean: { id: "bean1", name: "Ethiopia Yirgacheffe" },
    });
  });

  it("shows bean name as heading", () => {
    mockOwner();
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Ethiopia Yirgacheffe",
    );
  });

  it("shows bean metadata", () => {
    mockOwner();
    renderPage();
    const metadata = screen.getByTestId("bean-metadata");
    expect(metadata).toBeInTheDocument();
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
    expect(screen.getByText("Heirloom")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("shows edit button for owner", () => {
    mockOwner();
    renderPage();
    expect(screen.getByTestId("edit-btn")).toBeInTheDocument();
  });

  it("hides edit button for non-owner", () => {
    mockNonOwner();
    renderPage();
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
  });

  it("shows roast history table", () => {
    mockOwner();
    renderPage();
    expect(screen.getByTestId("roast-history")).toBeInTheDocument();
    expect(screen.getByTestId("roasts-table")).toBeInTheDocument();
  });

  it("shows supplier notes pills", () => {
    mockOwner();
    renderPage();
    expect(screen.getByTestId("supplier-notes")).toBeInTheDocument();
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it("shows loading skeleton while loading", () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuth>);

    mockUseQuery.mockImplementation((() => ({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    })) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("bean-detail-loading")).toBeInTheDocument();
  });

  it("shows bean not found when bean is missing", () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
    } as ReturnType<typeof useAuth>);

    mockUseQuery.mockImplementation((() => ({
      data: { bean: null },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("bean-not-found")).toBeInTheDocument();
    expect(screen.getByText("Bean not found")).toBeInTheDocument();
  });

  it("shows 'no roasts' message when roast history is empty", () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuth>);

    mockUseQuery.mockImplementation(((query: unknown) => {
      if (query === PUBLIC_BEAN_QUERY) {
        return { data: mockBean, loading: false, error: undefined, refetch: vi.fn() };
      }
      if (query === MY_BEANS_QUERY) {
        return { data: mockMyBeans, loading: false, error: undefined, refetch: vi.fn() };
      }
      if (query === ROASTS_BY_BEAN_QUERY) {
        return { data: { roastsByBean: [] }, loading: false, error: undefined, refetch: vi.fn() };
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
    }) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("no-roasts")).toBeInTheDocument();
    expect(screen.getByText("No roasts logged for this bean yet")).toBeInTheDocument();
  });

  it("shows the user's short name for the bean (owner)", () => {
    mockOwner();
    renderPage();
    expect(screen.getByTestId("short-name-card")).toBeInTheDocument();
    expect(screen.getByTestId("short-name-value")).toHaveTextContent("ETH");
  });

  it("hides short name card for non-owners", () => {
    mockNonOwner();
    renderPage();
    expect(screen.queryByTestId("short-name-card")).not.toBeInTheDocument();
  });

  it("editing reveals an input prefilled with current short name", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    mockOwner();
    renderPage();

    await user.click(screen.getByTestId("edit-btn"));
    const input = screen.getByTestId("short-name-input") as HTMLInputElement;
    expect(input.value).toBe("ETH");
  });

  it("saving fires updateUserBean when short name changed", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const { useMutation } = await import("@apollo/client/react");
    const { UPDATE_BEAN, UPDATE_USER_BEAN } = await import("../../../graphql/operations");
    const updateBeanFn = vi.fn();
    const updateUserBeanFn = vi.fn();
    // useMutation re-runs on every render — bind spies per-mutation so they
    // remain stable across re-renders triggered by user input.
    vi.mocked(useMutation).mockImplementation(((mutation: unknown) => {
      if (mutation === UPDATE_BEAN) return [updateBeanFn, { loading: false }];
      if (mutation === UPDATE_USER_BEAN) return [updateUserBeanFn, { loading: false }];
      return [vi.fn(), { loading: false }];
    }) as unknown as typeof useMutation);

    const user = userEvent.setup();
    mockOwner();
    renderPage();

    await user.click(screen.getByTestId("edit-btn"));
    const input = screen.getByTestId("short-name-input");
    await user.clear(input);
    await user.type(input, "EYG");
    await user.click(screen.getByText("Save"));

    expect(updateUserBeanFn).toHaveBeenCalledWith({
      variables: { id: "ub1", shortName: "EYG" },
    });
  });

  it("setting a short name when none existed fires updateUserBean", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const { useMutation } = await import("@apollo/client/react");
    const { UPDATE_BEAN, UPDATE_USER_BEAN } = await import("../../../graphql/operations");
    const updateBeanFn = vi.fn();
    const updateUserBeanFn = vi.fn();
    vi.mocked(useMutation).mockImplementation(((mutation: unknown) => {
      if (mutation === UPDATE_BEAN) return [updateBeanFn, { loading: false }];
      if (mutation === UPDATE_USER_BEAN) return [updateUserBeanFn, { loading: false }];
      return [vi.fn(), { loading: false }];
    }) as unknown as typeof useMutation);

    // Owner with no short name set yet
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: "user1",
    } as ReturnType<typeof useAuth>);
    mockUseQuery.mockImplementation(((query: unknown) => {
      if (query === PUBLIC_BEAN_QUERY) {
        return { data: mockBean, loading: false, error: undefined, refetch: vi.fn() };
      }
      if (query === MY_BEANS_QUERY) {
        return {
          data: {
            myBeans: [{ ...mockMyBeans.myBeans[0], shortName: null }],
          },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        };
      }
      if (query === ROASTS_BY_BEAN_QUERY) {
        return { data: mockRoasts, loading: false, error: undefined, refetch: vi.fn() };
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
    }) as unknown as typeof useQuery);

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("edit-btn"));
    const input = screen.getByTestId("short-name-input") as HTMLInputElement;
    expect(input.value).toBe("");
    await user.type(input, "EYG");
    await user.click(screen.getByText("Save"));

    expect(updateUserBeanFn).toHaveBeenCalledWith({
      variables: { id: "ub1", shortName: "EYG" },
    });
  });

  it("save does not fire updateUserBean when short name unchanged", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const { useMutation } = await import("@apollo/client/react");
    const { UPDATE_BEAN, UPDATE_USER_BEAN } = await import("../../../graphql/operations");
    const updateBeanFn = vi.fn();
    const updateUserBeanFn = vi.fn();
    vi.mocked(useMutation).mockImplementation(((mutation: unknown) => {
      if (mutation === UPDATE_BEAN) return [updateBeanFn, { loading: false }];
      if (mutation === UPDATE_USER_BEAN) return [updateUserBeanFn, { loading: false }];
      return [vi.fn(), { loading: false }];
    }) as unknown as typeof useMutation);

    const user = userEvent.setup();
    mockOwner();
    renderPage();

    await user.click(screen.getByTestId("edit-btn"));
    await user.click(screen.getByText("Save"));

    expect(updateUserBeanFn).not.toHaveBeenCalled();
  });

  it("shows error state on error", () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
    } as ReturnType<typeof useAuth>);

    mockUseQuery.mockImplementation(((query: unknown) => {
      if (query === PUBLIC_BEAN_QUERY) {
        return { data: undefined, loading: false, error: new Error("Network error"), refetch: vi.fn() };
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
    }) as unknown as typeof useQuery);

    renderPage();
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });
});
