import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Delete Bean",
    message: "Are you sure you want to delete this bean?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders with data-testid", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("renders title and message", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete Bean")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this bean?")
    ).toBeInTheDocument();
  });

  it("renders default button labels", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders custom button labels", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
      />
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("Keep it")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("applies danger variant styling to confirm button", () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);
    const confirmBtn = screen.getByText("Confirm");
    expect(confirmBtn.className).toContain("danger");
  });

  it("does not apply danger styling for default variant", () => {
    render(<ConfirmDialog {...defaultProps} variant="default" />);
    const confirmBtn = screen.getByText("Confirm");
    expect(confirmBtn.className).not.toContain("danger");
  });

  it("renders nothing when isOpen is false", () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
