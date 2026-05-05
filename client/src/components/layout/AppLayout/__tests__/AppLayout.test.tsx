import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "../AppLayout";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    getToken: vi.fn(),
    signOut: vi.fn(),
  }),
  useUser: () => ({ user: null }),
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: () => [vi.fn(), { data: null }],
  useMutation: () => [vi.fn(), { data: null }],
  useQuery: () => ({ data: null, loading: false }),
}));

vi.mock("../../../../providers/AppProviders", () => ({
  useTheme: () => ({ theme: "light" as const, toggleTheme: vi.fn() }),
  useTempUnit: () => ({
    tempUnit: "CELSIUS" as const,
    toggleTempUnit: vi.fn(),
  }),
}));

describe("AppLayout", () => {
  it("renders the header", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div data-testid="child-route">Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders child routes via Outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div data-testid="child-route">Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child-route")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("has the app-layout data-testid", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("app-layout")).toBeInTheDocument();
  });

  it("shows authenticated nav items when signed in", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "My Roasts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });
});
