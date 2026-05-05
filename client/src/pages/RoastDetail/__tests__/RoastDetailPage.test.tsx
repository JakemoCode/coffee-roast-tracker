import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { useAuthState } from "../../../lib/useAuthState";
import {
  ROAST_BY_ID_QUERY,
  PUBLIC_ROAST_QUERY,
} from "../../../graphql/operations";
import { RoastDetailPage } from "../RoastDetailPage";
import { ToastProvider } from "../../../components/Toast";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: () => [vi.fn(), { loading: false }],
  useLazyQuery: () => [vi.fn(), { data: undefined, loading: false }],
}));

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

vi.mock("../../../providers/AppProviders", () => ({
  useTempUnit: () => ({ tempUnit: "CELSIUS" as const, toggleTempUnit: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// Mock chart components to avoid canvas issues in jsdom
vi.mock("react-chartjs-2", () => ({
  Line: (props: Record<string, unknown>) => (
    <canvas data-testid="chart-canvas" {...props} />
  ),
}));

vi.mock("../../../lib/chartSetup", () => ({}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseAuth = vi.mocked(useAuthState);

const OWNER_USER_ID = "user_owner_123";
const OTHER_USER_ID = "user_other_456";

const mockRoast = {
  id: "roast-1",
  roastDate: "2025-12-01",
  notes: "Tasting notes here",
  rating: 4,
  ambientTemp: 22,
  developmentTime: 90,
  developmentPercent: 18.5,
  totalDuration: 600,
  colourChangeTime: 180,
  colourChangeTemp: 150,
  firstCrackTime: 420,
  firstCrackTemp: 195,
  roastEndTime: 540,
  roastEndTemp: 210,
  timeSeriesData: [
    { time: 0, meanTemp: 100, temp: 100 },
    { time: 60, meanTemp: 130, temp: 130 },
  ],
  roastProfileCurve: null,
  fanProfileCurve: null,
  isPublic: true,
  userId: OWNER_USER_ID,
  bean: {
    id: "bean-1",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Washed",
    elevation: null,
    variety: null,
    sourceUrl: null,
  },
  roastProfile: null,
  flavors: [
    { id: "f1", name: "Blueberry", category: "Berry", color: "#6366f1", isOffFlavor: false },
  ],
  offFlavors: [],
};

const mockBeanRoasts = [
  {
    id: "roast-2",
    roastDate: "2025-11-15",
    notes: null,
    developmentTime: 85,
    developmentPercent: 17.0,
    totalDuration: 580,
    firstCrackTemp: 198,
    roastEndTemp: 215,
    rating: 3,
    flavors: [],
    offFlavors: [],
  },
];

function renderWithRouter(routeId = "roast-1") {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/roasts/${routeId}`]}>
        <Routes>
          <Route path="/roasts/:id" element={<RoastDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

function setupOwnerMocks() {
  mockedUseAuth.mockReturnValue({
    userId: OWNER_USER_ID,
    isSignedIn: true,
    isLoaded: true,
  } as ReturnType<typeof useAuthState>);

  mockedUseQuery.mockImplementation((...args: unknown[]) => {
    const options = args[1] as { variables?: Record<string, unknown> } | undefined;
    const vars = options?.variables ?? {};

    // ROASTS_BY_BEAN_QUERY — has beanId variable
    if ("beanId" in vars) {
      return {
        data: { roastsByBean: mockBeanRoasts },
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useQuery>;
    }
    // FLAVOR_DESCRIPTORS_QUERY — has isOffFlavor variable
    if ("isOffFlavor" in vars) {
      return {
        data: { flavorDescriptors: [] },
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useQuery>;
    }
    // Default: ROAST_BY_ID_QUERY or PUBLIC_ROAST_QUERY
    return {
      data: { roastById: mockRoast },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>;
  });
}

function setupNonOwnerMocks(roastOverrides?: Partial<typeof mockRoast>) {
  // Non-owner is unauthenticated — the component uses the public query path
  mockedUseAuth.mockReturnValue({
    userId: null,
    isSignedIn: false,
    isLoaded: true,
  } as ReturnType<typeof useAuthState>);

  const roast = { ...mockRoast, ...roastOverrides };

  mockedUseQuery.mockImplementation((query: unknown, ..._rest: unknown[]) => {
    const options = _rest[0] as { variables?: Record<string, unknown> } | undefined;
    const vars = options?.variables ?? {};

    if ("beanId" in vars || "isOffFlavor" in vars) {
      return {
        data: null,
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useQuery>;
    }
    // Public query returns the roast
    if (query === PUBLIC_ROAST_QUERY) {
      return {
        data: { roast },
        loading: false,
        error: undefined,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>;
    }
    // Auth query is skipped for unauthenticated users
    return {
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>;
  });
}

describe("RoastDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows bean name heading when data loads", () => {
    setupOwnerMocks();
    renderWithRouter();
    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });

  it("shows chart", () => {
    setupOwnerMocks();
    renderWithRouter();
    expect(screen.getByTestId("roast-chart")).toBeInTheDocument();
  });

  it("shows metrics table", () => {
    setupOwnerMocks();
    renderWithRouter();
    expect(screen.getByTestId("metrics-table")).toBeInTheDocument();
  });

  it("shows edit controls for owner", () => {
    setupOwnerMocks();
    renderWithRouter();
    expect(screen.getByTestId("owner-actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share link/i })).toBeInTheDocument();
    expect(screen.getByText("Edit Flavors")).toBeInTheDocument();
    expect(screen.getByText("Edit Off-Flavors")).toBeInTheDocument();
  });

  it("hides edit controls for non-owner", () => {
    setupNonOwnerMocks();
    renderWithRouter();
    expect(screen.queryByTestId("owner-actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Flavors")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Off-Flavors")).not.toBeInTheDocument();
  });

  it("shows 'This roast is private' for private non-owner roast", () => {
    setupNonOwnerMocks({ isPublic: false });
    renderWithRouter();
    expect(screen.getByText("This roast is private")).toBeInTheDocument();
  });

  it("shows unified metrics table for owner", () => {
    setupOwnerMocks();
    renderWithRouter();
    expect(screen.getByTestId("metrics-table")).toBeInTheDocument();
  });

  it("shows loading skeleton while loading", () => {
    mockedUseAuth.mockReturnValue({
      userId: OWNER_USER_ID,
      isSignedIn: true,
      isLoaded: true,
    } as ReturnType<typeof useAuthState>);

    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state on error", () => {
    mockedUseAuth.mockReturnValue({
      userId: OWNER_USER_ID,
      isSignedIn: true,
      isLoaded: true,
    } as ReturnType<typeof useAuthState>);

    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("shows 'Roast not found' when data is null", () => {
    mockedUseAuth.mockReturnValue({
      userId: OWNER_USER_ID,
      isSignedIn: true,
      isLoaded: true,
    } as ReturnType<typeof useAuthState>);

    mockedUseQuery.mockReturnValue({
      data: { roastById: null },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(screen.getByText("Roast not found")).toBeInTheDocument();
  });
});
