import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoastChart } from "../RoastChart";
import type { TimeSeriesEntry } from "../RoastChart";

// Mock react-chartjs-2 to avoid canvas rendering in jsdom
vi.mock("react-chartjs-2", () => ({
  Line: (props: Record<string, unknown>) => (
    <canvas data-testid="chart-canvas" {...props} />
  ),
}));

// Mock chartSetup to avoid Chart.js registration side effects
vi.mock("../../../lib/chartSetup", () => ({}));

function makeSampleData(count = 20): TimeSeriesEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 10,
    spotTemp: 100 + i * 2,
    temp: 120 + i * 3,
    meanTemp: 115 + i * 3,
    profileTemp: 110 + i * 3,
    profileROR: 8 - i * 0.2,
    actualROR: 7.5 - i * 0.2,
    desiredROR: 8 - i * 0.15,
    powerKW: 1.2 - i * 0.03,
    actualFanRPM: 1500 + i * 10,
  }));
}

describe("RoastChart", () => {
  it("renders without crashing with sample data", () => {
    render(
      <RoastChart
        timeSeriesData={makeSampleData()}
        colourChangeTime={60}
        firstCrackTime={120}
        roastEndTime={180}
        totalDuration={190}
      />,
    );
    expect(screen.getByTestId("roast-chart")).toBeInTheDocument();
    expect(screen.getByTestId("chart-canvas")).toBeInTheDocument();
  });

  it("renders without crashing with empty data", () => {
    render(<RoastChart timeSeriesData={[]} />);
    expect(screen.getByTestId("roast-chart")).toBeInTheDocument();
  });

  it("renders dataset toggle buttons", () => {
    render(<RoastChart timeSeriesData={makeSampleData()} />);

    expect(screen.getByRole("button", { name: "Mean Temp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile Target" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fan RPM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Power kW" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RoR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spot Temp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desired RoR" })).toBeInTheDocument();
  });

  it("renders phase zoom buttons", () => {
    render(<RoastChart timeSeriesData={makeSampleData()} />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maillard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dev" })).toBeInTheDocument();
  });

  it("toggles dataset buttons on click", async () => {
    const user = userEvent.setup();
    render(<RoastChart timeSeriesData={makeSampleData()} />);

    const meanTempBtn = screen.getByRole("button", { name: "Mean Temp" });
    // Default on
    expect(meanTempBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(meanTempBtn);
    expect(meanTempBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(meanTempBtn);
    expect(meanTempBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("switches phase zoom on click", async () => {
    const user = userEvent.setup();
    render(<RoastChart timeSeriesData={makeSampleData()} />);

    const dryBtn = screen.getByRole("button", { name: "Dry" });
    const allBtn = screen.getByRole("button", { name: "All" });

    expect(allBtn).toHaveAttribute("aria-pressed", "true");
    expect(dryBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(dryBtn);
    expect(dryBtn).toHaveAttribute("aria-pressed", "true");
    expect(allBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("renders gear settings button", () => {
    render(<RoastChart timeSeriesData={makeSampleData()} />);
    expect(screen.getByRole("button", { name: "Chart settings" })).toBeInTheDocument();
  });

  it("toggles grid settings panel on gear click", async () => {
    const user = userEvent.setup();
    render(<RoastChart timeSeriesData={makeSampleData()} />);

    expect(screen.queryByText("Show grid lines")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chart settings" }));
    expect(screen.getByText("Show grid lines")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chart settings" }));
    expect(screen.queryByText("Show grid lines")).not.toBeInTheDocument();
  });

  it("has data-testid on root element", () => {
    render(<RoastChart timeSeriesData={makeSampleData()} />);
    expect(screen.getByTestId("roast-chart")).toBeInTheDocument();
  });
});
