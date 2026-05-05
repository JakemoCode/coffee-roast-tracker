import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBeanModal } from "../AddBeanModal";

const mockParseNotes = vi.fn();
vi.mock("@apollo/client/react", () => ({
  useLazyQuery: vi.fn(() => [mockParseNotes, { loading: false }]),
}));

/**
 * Integration tests for the AddBeanModal form flow.
 *
 * Covers user stories:
 *   US-AB-1  Add bean happy path with supplier
 *   US-AB-2  Required field validation (button state machine)
 *   US-AB-3  Flavor parsing with no matches
 *
 * Uses userEvent.setup() for realistic input simulation.
 */

const mockFlavors = [
  { name: "Jasmine", color: "#db7093" },
  { name: "Blueberry", color: "#6a5acd" },
  { name: "Dark Chocolate", color: "#8b5e4b" },
  { name: "Caramel", color: "#a88545" },
  { name: "Honey", color: "#daa520" },
];

function renderAddBeanModal(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    flavors: mockFlavors,
    ...overrides,
  };
  return { ...render(<AddBeanModal {...defaultProps} />), props: defaultProps };
}

describe("AddBeanModal integration: form flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- US-AB-2: Button state machine ----

  it("button state machine: tracks enabled/disabled through field changes", async () => {
    const user = userEvent.setup();
    renderAddBeanModal();

    const saveBtn = screen.getByText("Save");

    // Initial state: all empty → disabled
    expect(saveBtn).toBeDisabled();

    // Fill name only → still disabled
    const nameInput = screen.getByPlaceholderText("Bean name, e.g. Kenya AA");
    fireEvent.change(nameInput, { target: { value: "Kenya AA" } });
    expect(saveBtn).toBeDisabled();

    // Fill origin → still disabled (process missing)
    const originInput = screen.getByPlaceholderText(
      "Origin, e.g. Yirgacheffe, Ethiopia",
    );
    fireEvent.change(originInput, { target: { value: "Nyeri, Kenya" } });
    expect(saveBtn).toBeDisabled();

    // Fill process → enabled
    const processCombobox = screen.getByPlaceholderText("Select a process");
    await user.click(processCombobox);
    await user.click(screen.getByText("Washed"));
    expect(saveBtn).not.toBeDisabled();

    // Clear name → disabled again
    fireEvent.change(nameInput, { target: { value: "" } });
    expect(saveBtn).toBeDisabled();
  });

  // ---- US-AB-1: Happy path with supplier and bagNotes ----

  it("happy path: fill all fields including supplier and bagNotes → save", async () => {
    const user = userEvent.setup();
    const { props } = renderAddBeanModal();

    // Required fields
    fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
      target: { value: "Kenya AA Kiambu" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"),
      { target: { value: "Kiambu, Kenya" } },
    );

    const processCombobox = screen.getByPlaceholderText("Select a process");
    await user.click(processCombobox);
    await user.click(screen.getByText("Natural"));

    // Optional fields
    fireEvent.change(screen.getByPlaceholderText("e.g. Bourbon, SL28"), {
      target: { value: "SL28" },
    });
    // Supplier is a Combobox with allowCustom — type into it directly
    const supplierCombobox = screen.getByPlaceholderText("e.g. Sweet Maria's");
    await user.type(supplierCombobox, "Sweet Maria's");
    fireEvent.change(
      screen.getByPlaceholderText("Supplier's description of this bean"),
      { target: { value: "Bright and complex with wine-like acidity" } },
    );

    // Save
    await user.click(screen.getByText("Save"));

    expect(props.onSave).toHaveBeenCalledOnce();
    const saved = (props.onSave as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(saved).toMatchObject({
      name: "Kenya AA Kiambu",
      origin: "Kiambu, Kenya",
      process: "Natural",
      variety: "SL28",
      supplier: "Sweet Maria's",
      bagNotes: "Bright and complex with wine-like acidity",
    });
  });

  // ---- Flavor parsing: matched flavors ----

  it("flavor parsing: supplier notes with known flavors → matched pills appear", async () => {
    const user = userEvent.setup();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [
          { name: "Jasmine", category: "FLORAL", color: "#db7093" },
          { name: "Blueberry", category: "FRUITY", color: "#6a5acd" },
          { name: "Caramel", category: "SWEET", color: "#a88545" },
        ],
      },
    });
    renderAddBeanModal();

    const cuppingTextarea = screen.getByPlaceholderText(
      "Supplier's description of this bean",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "jasmine and blueberry with caramel sweetness" },
    });

    await user.click(screen.getByText("Parse Flavors"));

    // Should show matched flavor pills
    const pills = screen.getAllByTestId("flavor-pill");
    const pillNames = pills.map((p) => {
      const nameSpan = p.querySelector("[class*=name]");
      return nameSpan?.textContent?.trim();
    });
    expect(pillNames).toContain("Jasmine");
    expect(pillNames).toContain("Blueberry");
    expect(pillNames).toContain("Caramel");
  });

  // ---- US-AB-3: Flavor parsing no match ----

  it("flavor parsing no match: gibberish → 'No flavors matched' shown, save still works", async () => {
    const user = userEvent.setup();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [],
      },
    });
    const { props } = renderAddBeanModal();

    // Fill required fields so save is possible
    fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
      target: { value: "Mystery Bean" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"),
      { target: { value: "Unknown" } },
    );

    const processCombobox = screen.getByPlaceholderText("Select a process");
    await user.click(processCombobox);
    await user.click(screen.getByText("Washed"));

    // Type gibberish supplier notes
    const cuppingTextarea = screen.getByPlaceholderText(
      "Supplier's description of this bean",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "xylophone zarquon plinth" },
    });

    await user.click(screen.getByText("Parse Flavors"));

    // Should show no-match message
    expect(
      screen.getByText(/No flavors matched/),
    ).toBeInTheDocument();

    // Save should still be enabled and work
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    expect(props.onSave).toHaveBeenCalledOnce();
    const saved = (props.onSave as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(saved.suggestedFlavors).toBeUndefined();
  });

  // ---- Focus retention ----

  it("name input retains value across multiple edits", () => {
    renderAddBeanModal();

    const nameInput = screen.getByPlaceholderText("Bean name, e.g. Kenya AA");

    // Set value and verify it persists
    fireEvent.change(nameInput, { target: { value: "Ethiopia Sidamo" } });
    expect(nameInput).toHaveValue("Ethiopia Sidamo");

    // Edit again — value should update, not be lost
    fireEvent.change(nameInput, {
      target: { value: "Ethiopia Sidamo Grade 1" },
    });
    expect(nameInput).toHaveValue("Ethiopia Sidamo Grade 1");
  });

  // ---- Minimal mode (inline creation during upload) ----

  it("minimal mode: only name required, save enabled with just name", async () => {
    const user = userEvent.setup();
    const { props } = renderAddBeanModal({ minimal: true });

    const saveBtn = screen.getByText("Save");

    // Initially disabled
    expect(saveBtn).toBeDisabled();

    // Fill only name
    const nameInput = screen.getByPlaceholderText("Bean name, e.g. Kenya AA");
    fireEvent.change(nameInput, { target: { value: "Quick Bean" } });

    // Should be enabled — minimal mode only requires name
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    expect(props.onSave).toHaveBeenCalledOnce();
    const saved = (props.onSave as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(saved.name).toBe("Quick Bean");
  });

  // ---- Cancel ----

  it("cancel calls onClose without saving", async () => {
    const user = userEvent.setup();
    const { props } = renderAddBeanModal();

    await user.click(screen.getByText("Cancel"));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
