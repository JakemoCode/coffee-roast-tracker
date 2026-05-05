import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../Toast";

function TestConsumer() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast("Success!", "success")}>Show Success</button>
      <button onClick={() => showToast("Error!", "error")}>Show Error</button>
      <button onClick={() => showToast("Info!")}>Show Info</button>
    </div>
  );
}

describe("Toast", () => {
  it("renders no toasts initially", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("shows a toast when showToast is called", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText("Show Success"));
    expect(screen.getByTestId("toast")).toBeInTheDocument();
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("defaults to info variant", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText("Show Info"));
    const toast = screen.getByTestId("toast");
    expect(toast).toBeInTheDocument();
    expect(toast.className).toMatch(/info/);
  });

  it("applies correct variant class", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText("Show Error"));
    const toast = screen.getByTestId("toast");
    expect(toast.className).toMatch(/error/);
  });

  it("stacks multiple toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText("Show Success"));
    await user.click(screen.getByText("Show Error"));
    const toasts = screen.getAllByTestId("toast");
    expect(toasts).toHaveLength(2);
  });

  it("has accessible role and aria-live", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText("Show Info"));
    const toast = screen.getByTestId("toast");
    expect(toast).toHaveAttribute("role", "status");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("throws when useToast is used outside ToastProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useToast must be used within a ToastProvider"
    );
    spy.mockRestore();
  });

  it("dismisses toast on user interaction after delay", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Success"));
    expect(screen.getByTestId("toast")).toBeInTheDocument();

    // Wait for the 100ms delay that prevents immediate dismiss
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    // Click anywhere to dismiss
    await user.click(document.body);
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });
});
