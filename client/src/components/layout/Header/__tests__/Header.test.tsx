import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Header } from "../Header";

const defaultProps = {
  isAuthenticated: false,
  tempUnit: "CELSIUS" as const,
  onToggleTempUnit: vi.fn(),
  theme: "light" as const,
  onToggleTheme: vi.fn(),
  privateByDefault: false,
  onTogglePrivacyDefault: vi.fn(),
  onSignOut: vi.fn(),
  onUploadOpen: vi.fn(),
};

function renderHeader(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <MemoryRouter>
      <Header {...defaultProps} {...overrides} />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  it("renders the app name as a link to /", () => {
    renderHeader();
    const logo = screen.getByText("Coffee Roast Tracker");
    expect(logo).toBeInTheDocument();
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });

  it("always shows the Beans link", () => {
    renderHeader();
    const beansLink = screen.getByRole("link", { name: "Beans" });
    expect(beansLink).toBeInTheDocument();
    expect(beansLink).toHaveAttribute("href", "/beans");
  });

  it("shows My Roasts and Upload when authenticated", () => {
    renderHeader({ isAuthenticated: true });
    expect(screen.getByRole("link", { name: "My Roasts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("hides My Roasts and Upload when not authenticated", () => {
    renderHeader({ isAuthenticated: false });
    expect(screen.queryByRole("link", { name: "My Roasts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
  });

  it("renders TempToggle and ThemeToggle", () => {
    renderHeader();
    expect(screen.getByTestId("temp-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("calls onUploadOpen when Upload button is clicked", async () => {
    const onUploadOpen = vi.fn();
    const user = userEvent.setup();
    renderHeader({ isAuthenticated: true, onUploadOpen });

    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(onUploadOpen).toHaveBeenCalledTimes(1);
  });

  it("renders with data-testid header", () => {
    renderHeader();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders UserButton", () => {
    renderHeader();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });
});
