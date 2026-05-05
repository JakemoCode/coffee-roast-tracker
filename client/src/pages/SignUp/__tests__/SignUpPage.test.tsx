import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignUpPage } from "../SignUpPage";

vi.mock("@clerk/clerk-react", () => ({
  SignUp: () => <div data-testid="clerk-sign-up">Sign Up</div>,
}));

describe("SignUpPage", () => {
  it("renders the Clerk SignUp component", () => {
    render(<SignUpPage />);
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
  });

  it("renders a centered container", () => {
    const { container } = render(<SignUpPage />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
  });
});
