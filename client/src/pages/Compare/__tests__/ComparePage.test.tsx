import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useQuery } from "@apollo/client/react";
import { ComparePage } from "../ComparePage";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("../../../providers/AppProviders", () => ({
  useTempUnit: () => ({ tempUnit: "CELSIUS" as const, toggleTempUnit: vi.fn() }),
}));

// Mock chart components to avoid canvas issues in jsdom
vi.mock("react-chartjs-2", () => ({
  Line: (props: Record<string, unknown>) => (
    <canvas data-testid="chart-canvas" {...props} />
  ),
}));

vi.mock("../../../lib/chartSetup", () => ({}));

const mockedUseQuery = vi.mocked(useQuery);

const mockRoasts = [
  {
    id: "r1",
    roastDate: "2025-12-01",
    developmentTime: 90,
    developmentPercent: 18.5,
    totalDuration: 600,
    firstCrackTemp: 195,
    roastEndTemp: 210,
    colourChangeTime: 180,
    colourChangeTemp: 150,
    firstCrackTime: 420,
    roastEndTime: 540,
    rating: 4,
    timeSeriesData: [
      { time: 0, temp: 100, meanTemp: 100 },
      { time: 60, temp: 130, meanTemp: 130 },
    ],
    bean: { id: "b1", name: "Ethiopia Yirgacheffe" },
  },
  {
    id: "r2",
    roastDate: "2025-12-05",
    developmentTime: 85,
    developmentPercent: 17.0,
    totalDuration: 580,
    firstCrackTemp: 198,
    roastEndTemp: 215,
    colourChangeTime: 175,
    colourChangeTemp: 148,
    firstCrackTime: 410,
    roastEndTime: 530,
    rating: 5,
    timeSeriesData: [
      { time: 0, temp: 98, meanTemp: 98 },
      { time: 60, temp: 128, meanTemp: 128 },
    ],
    bean: { id: "b2", name: "Colombia Huila" },
  },
];

function renderWithRouter(searchParams = "") {
  return render(
    <MemoryRouter initialEntries={[`/compare${searchParams}`]}>
      <ComparePage />
    </MemoryRouter>,
  );
}

describe("ComparePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Compare Roasts' heading", () => {
    mockedUseQuery.mockReturnValue({
      data: { roastsByIds: mockRoasts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter("?ids=r1,r2");
    expect(
      screen.getByRole("heading", { name: "Compare Roasts" }),
    ).toBeInTheDocument();
  });

  it("shows chart when data loads", () => {
    mockedUseQuery.mockReturnValue({
      data: { roastsByIds: mockRoasts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter("?ids=r1,r2");
    expect(screen.getByTestId("compare-chart")).toBeInTheDocument();
    expect(screen.getByTestId("chart-canvas")).toBeInTheDocument();
  });

  it("shows metrics comparison table", () => {
    mockedUseQuery.mockReturnValue({
      data: { roastsByIds: mockRoasts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter("?ids=r1,r2");
    expect(screen.getByTestId("compare-metrics")).toBeInTheDocument();
    // Verify both beans appear in the table
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Colombia Huila")).toBeInTheDocument();
  });

  it("shows message when no IDs provided", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter();
    expect(
      screen.getByText("Select roasts to compare from the dashboard"),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton while loading", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter("?ids=r1,r2");
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state on error", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    renderWithRouter("?ids=r1,r2");
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });
});
