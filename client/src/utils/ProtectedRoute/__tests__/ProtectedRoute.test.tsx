import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../ProtectedRoute";

const mockUseAuth = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRouter(initialRoute = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route
            path="/protected"
            element={<div data-testid="protected-content">Secret</div>}
          />
        </Route>
        <Route
          path="/sign-in"
          element={<div data-testid="sign-in-page">Sign In</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: false });
    const { container } = renderWithRouter();
    expect(container.innerHTML).toBe("");
  });

  it("redirects to /sign-in when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
    renderWithRouter();
    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders the outlet when authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderWithRouter();
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
