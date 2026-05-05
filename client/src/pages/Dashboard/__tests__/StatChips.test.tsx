import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatChips } from "../StatChips";

describe("StatChips", () => {
  const defaultProps = {
    totalRoasts: 42,
    avgRating: 4.3,
    topBean: "Ethiopia Yirgacheffe",
  };

  it("renders the stat-chips container", () => {
    render(<StatChips {...defaultProps} />);
    expect(screen.getByTestId("stat-chips")).toBeInTheDocument();
  });

  it("displays total roasts", () => {
    render(<StatChips {...defaultProps} />);
    expect(screen.getByText("Total Roasts")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("displays average rating with one decimal", () => {
    render(<StatChips {...defaultProps} />);
    expect(screen.getByText("Avg Rating")).toBeInTheDocument();
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("displays top bean name", () => {
    render(<StatChips {...defaultProps} />);
    expect(screen.getByText("Top Bean")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
  });

  it("renders exactly 3 chips", () => {
    render(<StatChips {...defaultProps} />);
    const container = screen.getByTestId("stat-chips");
    expect(container.children).toHaveLength(3);
  });

  it("formats a whole-number rating with one decimal", () => {
    render(<StatChips {...defaultProps} avgRating={5} />);
    expect(screen.getByText("5.0")).toBeInTheDocument();
  });
});
