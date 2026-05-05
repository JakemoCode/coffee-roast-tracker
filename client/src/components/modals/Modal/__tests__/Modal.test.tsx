import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      <Modal isOpen={false} title="Test" onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and children when open", () => {
    render(
      <Modal isOpen={true} title="Test Modal" onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    render(
      <Modal isOpen={true} title="Accessible Modal" onClose={() => {}}>
        Content
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Accessible Modal");
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Test" onClose={onClose}>
        Content
      </Modal>
    );
    await user.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Test" onClose={onClose}>
        Content
      </Modal>
    );
    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when modal content clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Test" onClose={onClose}>
        <button>Inner button</button>
      </Modal>
    );
    await user.click(screen.getByText("Inner button"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Test" onClose={onClose}>
        Content
      </Modal>
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders footer when provided", () => {
    render(
      <Modal
        isOpen={true}
        title="Test"
        onClose={() => {}}
        footer={<button>Save</button>}
      >
        Content
      </Modal>
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("does not render footer when not provided", () => {
    const { container } = render(
      <Modal isOpen={true} title="Test" onClose={() => {}}>
        Content
      </Modal>
    );
    // The footer div should not exist
    expect(container.ownerDocument.querySelector("[class*=footer]")).not.toBeInTheDocument();
  });

  it("does not steal focus from child inputs during typing", async () => {
    const user = userEvent.setup();

    function TestForm() {
      const [value, setValue] = useState("");
      return (
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <input
            data-testid="test-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Modal>
      );
    }

    render(<TestForm />);

    // Wait for initial focus to settle
    await new Promise((r) => setTimeout(r, 50));

    const input = screen.getByTestId("test-input");
    await user.click(input);
    await user.type(input, "Hello World");

    expect(input).toHaveFocus();
    expect(input).toHaveValue("Hello World");
  });
});
