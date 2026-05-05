import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  it("renders the sun icon in light mode", () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);
    expect(screen.getByTestId("theme-toggle")).toHaveTextContent("\u2600");
  });

  it("renders the moon icon in dark mode", () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByTestId("theme-toggle")).toHaveTextContent("\u{1F319}");
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    await user.click(screen.getByTestId("theme-toggle"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('has aria-label "Toggle theme"', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);
    expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
  });
});
