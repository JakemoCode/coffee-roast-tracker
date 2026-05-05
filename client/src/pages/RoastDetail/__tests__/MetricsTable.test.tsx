import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricsTable } from "../MetricsTable";
import type { Metrics } from "../MetricsTable";

describe("MetricsTable", () => {
  const fullMetrics: Metrics = {
    totalDuration: 630,
    firstCrackTime: 480,
    developmentTime: 150,
    developmentPercent: 23.8,
    firstCrackTemp: 200,
    roastEndTemp: 215,
    colourChangeTime: 300,
    colourChangeTemp: 160,
    rating: 8,
  };

  it("renders the metrics-table container", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByTestId("metrics-table")).toBeInTheDocument();
  });

  it("displays total duration formatted as mm:ss", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByText("Total Duration")).toBeInTheDocument();
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("displays FC time formatted as mm:ss", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByText("FC Time")).toBeInTheDocument();
    expect(screen.getByText("8:00")).toBeInTheDocument();
  });

  it("displays temperatures in Celsius", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByText("200°C")).toBeInTheDocument();
    expect(screen.getByText("215°C")).toBeInTheDocument();
  });

  it("displays temperatures in Fahrenheit when tempUnit is FAHRENHEIT", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="FAHRENHEIT" />);
    // 200C = 392F, 215C = 419F
    expect(screen.getByText("392°F")).toBeInTheDocument();
    expect(screen.getByText("419°F")).toBeInTheDocument();
  });

  it("displays DTR as a percentage", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByText("DTR")).toBeInTheDocument();
    expect(screen.getByText("23.8%")).toBeInTheDocument();
  });

  it("displays rating as x/10", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("8/10")).toBeInTheDocument();
  });

  it('shows em dash for missing optional fields', () => {
    render(<MetricsTable metrics={{} as Metrics} tempUnit="CELSIUS" />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(9);
  });

  it("renders 9 metric rows", () => {
    render(<MetricsTable metrics={fullMetrics} tempUnit="CELSIUS" />);
    const table = screen.getByTestId("metrics-table");
    expect(table.children).toHaveLength(9);
  });
});
