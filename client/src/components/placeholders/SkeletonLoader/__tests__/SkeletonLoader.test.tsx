import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonLoader } from "../SkeletonLoader";

describe("SkeletonLoader", () => {
  it("renders with default props", () => {
    render(<SkeletonLoader />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.children).toHaveLength(1);
  });

  it("renders correct number of items with count prop", () => {
    render(<SkeletonLoader count={3} />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.children).toHaveLength(3);
  });

  it("applies text variant class by default", () => {
    render(<SkeletonLoader />);
    const bone = screen.getByTestId("skeleton").firstElementChild;
    expect(bone?.className).toMatch(/text/);
  });

  it("applies card variant class", () => {
    render(<SkeletonLoader variant="card" />);
    const bone = screen.getByTestId("skeleton").firstElementChild;
    expect(bone?.className).toMatch(/card/);
  });

  it("applies table-row variant class", () => {
    render(<SkeletonLoader variant="table-row" />);
    const bone = screen.getByTestId("skeleton").firstElementChild;
    expect(bone?.className).toMatch(/tableRow/);
  });

  it("applies circle variant class", () => {
    render(<SkeletonLoader variant="circle" />);
    const bone = screen.getByTestId("skeleton").firstElementChild;
    expect(bone?.className).toMatch(/circle/);
  });

  it("applies custom width and height", () => {
    render(<SkeletonLoader width="200px" height="40px" />);
    const bone = screen.getByTestId("skeleton").firstElementChild as HTMLElement;
    expect(bone.style.width).toBe("200px");
    expect(bone.style.height).toBe("40px");
  });

  it("has accessible aria attributes", () => {
    render(<SkeletonLoader />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Loading");
  });

  it("does not apply inline styles when width and height are not provided", () => {
    render(<SkeletonLoader />);
    const bone = screen.getByTestId("skeleton").firstElementChild as HTMLElement;
    expect(bone.style.width).toBe("");
    expect(bone.style.height).toBe("");
  });
});
