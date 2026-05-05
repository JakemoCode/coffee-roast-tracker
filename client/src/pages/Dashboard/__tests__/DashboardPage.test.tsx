import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useQuery } from "@apollo/client/react";
import { DashboardPage } from "../DashboardPage";

const { mockRoastLookup } = vi.hoisted(() => {
  const mockRoastLookup = new Map<string, Record<string, unknown>>();
  return { mockRoastLookup };
});

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: () => [vi.fn(), { loading: false }],
  useFragment: (opts: { from: { id: string } }) => ({
    data: mockRoastLookup.get(opts.from.id) ?? { id: opts.from.id, bean: { name: "" } },
    complete: true,
  }),
}));

vi.mock("../../../providers/AppProviders", () => ({
  useTempUnit: () => ({ tempUnit: "CELSIUS" as const, toggleTempUnit: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);

const mockRoasts = [
  {
    id: "r1",
    roastDate: "2025-12-01",
    notes: "Fruity and bright",
    developmentTime: 90,
    developmentPercent: 18.5,
    totalDuration: 600,
    firstCrackTemp: 195,
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
  {
    id: "r2",
    roastDate: "2025-12-05",
    notes: "Chocolatey",
    developmentTime: 85,
    developmentPercent: 17.0,
    totalDuration: 580,
    firstCrackTemp: 198,
    roastEndTemp: 215,
    colourChangeTime: null,
    colourChangeTemp: null,
    firstCrackTime: null,
    roastEndTime: null,
    rating: 5,
    isPublic: false,
    bean: { id: "b2", name: "Colombia Huila" },
    flavors: [],
    offFlavors: [],
  },
];

const mockBeans = [
  {
    id: "ub1",
    shortName: "Yirg",
    notes: null,
    bean: {
      id: "b1",
      name: "Ethiopia Yirgacheffe",
      origin: "Ethiopia",
      process: "Washed",
      elevation: null,
      variety: null,
      sourceUrl: null,
      bagNotes: null,
      score: null,
      cropYear: null,
      suggestedFlavors: [],
    },
  },
];

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoastLookup.clear();
    for (const r of mockRoasts) {
      mockRoastLookup.set(r.id, r);
    }
  });

  it("shows 'My Roasts' heading", () => {
    mockedUseQuery.mockReturnValue({
      data: { myRoasts: mockRoasts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getByRole("heading", { name: "My Roasts" })).toBeInTheDocument();
  });

  it("shows stat chips with data", () => {
    mockedUseQuery.mockImplementation((query: unknown) => {
      const queryStr = String(query);
      if (queryStr.includes("MyBeans")) {
        return {
          data: { myBeans: mockBeans },
          loading: false,
          error: undefined,
        } as unknown as ReturnType<typeof useQuery>;
      }
      return {
        data: { myRoasts: mockRoasts },
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    });

    renderWithRouter();
    expect(screen.getByTestId("stat-chips")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("shows roasts table with data", () => {
    mockedUseQuery.mockReturnValue({
      data: { myRoasts: mockRoasts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getByTestId("roasts-table")).toBeInTheDocument();
  });

  it("shows empty state when no roasts", () => {
    mockedUseQuery.mockReturnValue({
      data: { myRoasts: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/no roasts yet/i)).toBeInTheDocument();
  });

  it("shows loading skeleton while loading", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
