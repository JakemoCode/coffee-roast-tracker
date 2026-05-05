import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "../Pagination";

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  it("renders with data-testid and accessible nav", () => {
    render(<Pagination {...defaultProps} />);
    const nav = screen.getByTestId("pagination");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Pagination");
    expect(nav.tagName).toBe("NAV");
  });

  it("returns null when totalPages is 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders Previous and Next buttons", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
  });

  it("disables Previous button on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("disables Next button on last page", () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("enables both buttons on a middle page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByLabelText("Previous page")).toBeEnabled();
    expect(screen.getByLabelText("Next page")).toBeEnabled();
  });

  it("calls onPageChange with previous page on Previous click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={10} onPageChange={handleChange} />);

    await user.click(screen.getByLabelText("Previous page"));
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it("calls onPageChange with next page on Next click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={10} onPageChange={handleChange} />);

    await user.click(screen.getByLabelText("Next page"));
    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it("calls onPageChange when a page number is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={handleChange} />);

    await user.click(screen.getByLabelText("Page 3"));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("marks current page with aria-current", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Page 3")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Page 2")).not.toHaveAttribute("aria-current");
  });

  it("shows all pages for small page counts", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Page ${i}`)).toBeInTheDocument();
    }
  });

  it("shows ellipsis for large page counts", () => {
    render(<Pagination currentPage={5} totalPages={20} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 20")).toBeInTheDocument();
    // Ellipsis elements exist
    const nav = screen.getByTestId("pagination");
    expect(nav.textContent).toContain("\u2026");
  });
});
