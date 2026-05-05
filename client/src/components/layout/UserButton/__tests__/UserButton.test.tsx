import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { UserButton } from "../UserButton";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("UserButton", () => {
  it("renders Sign In link when logged out", () => {
    renderWithRouter(<UserButton isAuthenticated={false} />);
    const link = screen.getByTestId("user-button");
    expect(link).toHaveTextContent("Sign In");
    expect(link).toHaveAttribute("href", "/sign-in");
  });

  it("renders avatar button when logged in", () => {
    renderWithRouter(<UserButton isAuthenticated={true} />);
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User account" })).toBeInTheDocument();
  });

  it("opens dropdown on avatar click", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UserButton isAuthenticated={true} />);

    expect(screen.queryByTestId("user-dropdown")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "User account" }));

    expect(screen.getByTestId("user-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Private by default")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls onTogglePrivacyDefault when privacy toggle is clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(
      <UserButton
        isAuthenticated={true}
        privateByDefault={false}
        onTogglePrivacyDefault={onToggle}
      />
    );

    await user.click(screen.getByRole("button", { name: "User account" }));
    await user.click(screen.getByTestId("privacy-default-toggle"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onSignOut when Sign Out is clicked", async () => {
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(
      <UserButton isAuthenticated={true} onSignOut={onSignOut} />
    );

    await user.click(screen.getByRole("button", { name: "User account" }));
    await user.click(screen.getByText("Sign Out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("closes dropdown on click outside", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <div>
        <span data-testid="outside">outside</span>
        <UserButton isAuthenticated={true} />
      </div>
    );

    await user.click(screen.getByRole("button", { name: "User account" }));
    expect(screen.getByTestId("user-dropdown")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByTestId("user-dropdown")).not.toBeInTheDocument();
  });
});
