import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "../NotFoundPage";

function renderNotFoundPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("renders the 404 heading", () => {
    renderNotFoundPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /404/ }),
    ).toBeInTheDocument();
  });

  it("renders the page not found message", () => {
    renderNotFoundPage();
    expect(screen.getByText(/Page not found/)).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    renderNotFoundPage();
    const link = screen.getByRole("link", { name: "Go to home page" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("has the correct data-testid", () => {
    renderNotFoundPage();
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });

  it("renders the coffee cup SVG", () => {
    renderNotFoundPage();
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
