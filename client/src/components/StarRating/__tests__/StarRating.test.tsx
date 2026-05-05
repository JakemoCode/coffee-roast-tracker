import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StarRating } from "../StarRating";

describe("StarRating", () => {
  it("renders with data-testid", () => {
    render(<StarRating value={3} />);
    expect(screen.getByTestId("star-rating")).toBeInTheDocument();
  });

  it("displays correct aria-label with rating value", () => {
    render(<StarRating value={3.5} />);
    expect(screen.getByTestId("star-rating")).toHaveAttribute(
      "aria-label",
      "Rating: 3.5 out of 5",
    );
  });

  it("renders in read-only mode without radiogroup role", () => {
    render(<StarRating value={4} readOnly />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("renders interactive mode with radiogroup role when onChange provided", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("renders 10 radio buttons for interactive half-star support", () => {
    render(<StarRating value={0} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(10);
  });

  it("calls onChange with correct value on click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating value={0} onChange={handleChange} />);

    const rateThreeButton = screen.getByLabelText("Rate 3 stars");
    await user.click(rateThreeButton);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("calls onChange with half-star value on click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating value={0} onChange={handleChange} />);

    const rateHalfButton = screen.getByLabelText("Rate 2.5 stars");
    await user.click(rateHalfButton);
    expect(handleChange).toHaveBeenCalledWith(2.5);
  });

  it("does not render interactive buttons in readOnly mode", () => {
    render(<StarRating value={4} readOnly />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("does not render interactive buttons when onChange is not provided", () => {
    render(<StarRating value={4} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("supports size prop without errors", () => {
    const { rerender } = render(<StarRating value={3} size="sm" />);
    expect(screen.getByTestId("star-rating")).toBeInTheDocument();

    rerender(<StarRating value={3} size="lg" />);
    expect(screen.getByTestId("star-rating")).toBeInTheDocument();
  });
});
