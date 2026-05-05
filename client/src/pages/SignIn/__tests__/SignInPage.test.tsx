import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignInPage } from "../SignInPage";

vi.mock("@clerk/clerk-react", () => ({
  SignIn: () => <div data-testid="clerk-sign-in">Sign In</div>,
}));

describe("SignInPage", () => {
  it("renders the Clerk SignIn component", () => {
    render(<SignInPage />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("renders a centered container", () => {
    const { container } = render(<SignInPage />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
  });
});
