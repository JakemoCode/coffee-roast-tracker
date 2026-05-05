import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  const icon = <svg data-testid="test-icon" />;

  it("renders icon and message", () => {
    render(<EmptyState icon={icon} message="No roasts yet" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByText("No roasts yet")).toBeInTheDocument();
  });

  it("hides icon from assistive technology", () => {
    render(<EmptyState icon={icon} message="No roasts" />);
    const iconContainer = screen.getByTestId("test-icon").parentElement;
    expect(iconContainer).toHaveAttribute("aria-hidden", "true");
  });

  it("renders action button when action prop is provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={icon}
        message="No roasts"
        action={{ label: "Add Roast", onClick }}
      />
    );
    expect(screen.getByText("Add Roast")).toBeInTheDocument();
  });

  it("calls action onClick when button clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={icon}
        message="No roasts"
        action={{ label: "Add Roast", onClick }}
      />
    );
    await user.click(screen.getByText("Add Roast"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render action button when action prop is not provided", () => {
    render(<EmptyState icon={icon} message="No roasts" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
