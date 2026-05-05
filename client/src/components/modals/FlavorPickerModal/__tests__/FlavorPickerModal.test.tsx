import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlavorPickerModal } from "../FlavorPickerModal";
import type { FlavorDescriptor } from "../FlavorPickerModal";

const descriptors: FlavorDescriptor[] = [
  { id: "1", name: "Blueberry", category: "Berry" as FlavorDescriptor["category"], color: "#6a5acd", isOffFlavor: false },
  { id: "2", name: "Strawberry", category: "Berry" as FlavorDescriptor["category"], color: "#dc143c", isOffFlavor: false },
  { id: "3", name: "Lemon", category: "Citrus" as FlavorDescriptor["category"], color: "#ffd700", isOffFlavor: false },
  { id: "4", name: "Orange", category: "Citrus" as FlavorDescriptor["category"], color: "#ff8c00", isOffFlavor: false },
  { id: "5", name: "Chocolate", category: "Cocoa" as FlavorDescriptor["category"], color: "#8b4513", isOffFlavor: false },
  { id: "6", name: "Smoky", category: "Off" as FlavorDescriptor["category"], color: "#888888", isOffFlavor: true },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  mode: "flavors" as const,
  descriptors,
  selectedIds: [] as string[],
  onSave: vi.fn(),
};

describe("FlavorPickerModal", () => {
  it("renders with descriptors grouped by category", () => {
    render(<FlavorPickerModal {...defaultProps} />);

    expect(screen.getByTestId("flavor-picker-modal")).toBeInTheDocument();
    expect(screen.getByText("Select Flavors")).toBeInTheDocument();
    expect(screen.getByTestId("category-Berry")).toBeInTheDocument();
    expect(screen.getByTestId("category-Citrus")).toBeInTheDocument();
    expect(screen.getByText("Blueberry")).toBeInTheDocument();
    expect(screen.getByText("Lemon")).toBeInTheDocument();
  });

  it("renders with off-flavors title when mode is off-flavors", () => {
    render(<FlavorPickerModal {...defaultProps} mode="off-flavors" />);
    expect(screen.getByText("Select Off-Flavors")).toBeInTheDocument();
  });

  it("shows selected count as zero initially", () => {
    render(<FlavorPickerModal {...defaultProps} />);
    expect(screen.getByText("Selected (0)")).toBeInTheDocument();
    expect(screen.getByText("None selected")).toBeInTheDocument();
  });

  it("renders pre-selected descriptors in the selected section", () => {
    render(<FlavorPickerModal {...defaultProps} selectedIds={["1", "3"]} />);
    expect(screen.getByText("Selected (2)")).toBeInTheDocument();
    expect(screen.queryByText("None selected")).not.toBeInTheDocument();
  });

  it("filters descriptors by search text", async () => {
    const user = userEvent.setup();
    render(<FlavorPickerModal {...defaultProps} />);

    const searchInput = screen.getByLabelText("Search descriptors");
    await user.type(searchInput, "blue");

    expect(screen.getByText("Blueberry")).toBeInTheDocument();
    expect(screen.queryByText("Strawberry")).not.toBeInTheDocument();
    expect(screen.queryByText("Lemon")).not.toBeInTheDocument();
  });

  it("toggles selection when clicking a descriptor pill", async () => {
    const user = userEvent.setup();
    render(<FlavorPickerModal {...defaultProps} />);

    expect(screen.getByText("Selected (0)")).toBeInTheDocument();

    // Click the Blueberry descriptor button (aria-pressed=false)
    const blueberryBtn = screen.getByRole("button", { name: /Blueberry/i, pressed: false });
    await user.click(blueberryBtn);

    expect(screen.getByText("Selected (1)")).toBeInTheDocument();

    // Click again to deselect (now aria-pressed=true)
    const selectedBtn = screen.getByRole("button", { name: /Blueberry/i, pressed: true });
    await user.click(selectedBtn);

    expect(screen.getByText("Selected (0)")).toBeInTheDocument();
  });

  it("calls onSave with selected IDs when Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FlavorPickerModal
        {...defaultProps}
        selectedIds={["1", "3"]}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();

    const savedIds = onSave.mock.calls[0]![0] as string[];
    expect(savedIds).toContain("1");
    expect(savedIds).toContain("3");
    expect(savedIds).toHaveLength(2);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FlavorPickerModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows create custom section when onCreateDescriptor is provided", () => {
    const onCreateDescriptor = vi.fn();
    render(
      <FlavorPickerModal
        {...defaultProps}
        onCreateDescriptor={onCreateDescriptor}
      />,
    );

    expect(screen.getByText("Create custom")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom descriptor name")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Custom descriptor category"),
    ).toBeInTheDocument();
  });

  it("does not show create custom section without onCreateDescriptor", () => {
    render(<FlavorPickerModal {...defaultProps} />);
    expect(screen.queryByText("Create custom")).not.toBeInTheDocument();
  });

  it("calls onCreateDescriptor with name and category", async () => {
    const user = userEvent.setup();
    const onCreateDescriptor = vi.fn();
    render(
      <FlavorPickerModal
        {...defaultProps}
        onCreateDescriptor={onCreateDescriptor}
      />,
    );

    const nameInput = screen.getByLabelText("Custom descriptor name");
    fireEvent.change(nameInput, { target: { value: "Jasmine" } });
    await user.click(screen.getByText("Add"));

    expect(onCreateDescriptor).toHaveBeenCalledWith("Jasmine", "Floral");
  });

  it("collapses and expands category sections", async () => {
    const user = userEvent.setup();
    render(<FlavorPickerModal {...defaultProps} />);

    // Berry category should show pills initially
    expect(screen.getByText("Blueberry")).toBeInTheDocument();

    // Find the Berry category section and its header button (aria-expanded)
    const berrySection = screen.getByTestId("category-Berry");
    const berryHeader = within(berrySection).getByRole("button", { expanded: true });
    await user.click(berryHeader);

    // Pills should be hidden but category header still visible
    expect(screen.queryByText("Blueberry")).not.toBeInTheDocument();

    // Click again to expand
    const collapsedHeader = within(berrySection).getByRole("button", { expanded: false });
    await user.click(collapsedHeader);
    expect(screen.getByText("Blueberry")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<FlavorPickerModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("flavor-picker-modal")).not.toBeInTheDocument();
  });
});
