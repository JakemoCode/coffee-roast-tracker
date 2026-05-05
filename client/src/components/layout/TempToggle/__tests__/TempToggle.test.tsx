import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TempToggle } from "../TempToggle";

describe("TempToggle", () => {
  it("renders the Celsius label when unit is CELSIUS", () => {
    render(<TempToggle unit="CELSIUS" onToggle={() => {}} />);
    expect(screen.getByTestId("temp-toggle")).toHaveTextContent("\u00B0C");
  });

  it("renders the Fahrenheit label when unit is FAHRENHEIT", () => {
    render(<TempToggle unit="FAHRENHEIT" onToggle={() => {}} />);
    expect(screen.getByTestId("temp-toggle")).toHaveTextContent("\u00B0F");
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TempToggle unit="CELSIUS" onToggle={onToggle} />);

    await user.click(screen.getByTestId("temp-toggle"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("has an accessible label describing the switch target", () => {
    render(<TempToggle unit="CELSIUS" onToggle={() => {}} />);
    expect(screen.getByLabelText("Switch to Fahrenheit")).toBeInTheDocument();
  });

  it("updates aria-label when unit is FAHRENHEIT", () => {
    render(<TempToggle unit="FAHRENHEIT" onToggle={() => {}} />);
    expect(screen.getByLabelText("Switch to Celsius")).toBeInTheDocument();
  });
});
