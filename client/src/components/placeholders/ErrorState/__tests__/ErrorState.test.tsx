import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
  it("renders with default message", () => {
    render(<ErrorState />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<ErrorState message="Failed to load roasts" />);
    expect(screen.getByText("Failed to load roasts")).toBeInTheDocument();
  });

  it("has alert role for accessibility", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("hides the error icon from assistive technology", () => {
    render(<ErrorState />);
    const svg = screen.getByTestId("error-state").querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders retry button when onRetry is provided", () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls onRetry when retry button clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });
});
