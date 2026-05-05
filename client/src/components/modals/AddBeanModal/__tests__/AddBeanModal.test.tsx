import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBeanModal } from "../AddBeanModal";

const mockParseNotes = vi.fn();
vi.mock("@apollo/client/react", () => ({
  useLazyQuery: vi.fn(() => [mockParseNotes, { loading: false }]),
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

const flavors = [
  { name: "Blueberry", color: "#6a5acd" },
  { name: "Chocolate", color: "#8b4513" },
  { name: "Caramel", color: "#c4862a" },
  { name: "Citrus", color: "#ffd700" },
  { name: "Dark Chocolate", color: "#3d1c02" },
];

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
    target: { value: "Test Bean" },
  });
  fireEvent.change(screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"), {
    target: { value: "Colombia" },
  });

  // Select process via combobox (identified by placeholder)
  const processCombobox = screen.getByPlaceholderText("Select a process");
  await user.click(processCombobox);
  await user.click(screen.getByText("Washed"));
}

describe("AddBeanModal", () => {
  it("renders the modal when open", () => {
    render(<AddBeanModal {...defaultProps} />);

    expect(screen.getByTestId("add-bean-modal")).toBeInTheDocument();
    expect(screen.getByText("Add Bean")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<AddBeanModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("add-bean-modal")).not.toBeInTheDocument();
  });

  it("has Save Bean button disabled when required fields are empty", () => {
    render(<AddBeanModal {...defaultProps} />);
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toBeDisabled();
  });

  it("enables Save when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<AddBeanModal {...defaultProps} />);

    await fillRequiredFields(user);

    const saveBtn = screen.getByText("Save");
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls onSave with correct data when Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AddBeanModal {...defaultProps} onSave={onSave} />);

    // Use fireEvent.change to avoid Modal focus trap interference
    fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
      target: { value: "Ethiopia Yirgacheffe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"), {
      target: { value: "Yirgacheffe, Ethiopia" },
    });

    // Select process via combobox (identified by placeholder)
    const processCombobox = screen.getByPlaceholderText("Select a process");
    await user.click(processCombobox);
    await user.click(screen.getByText("Natural"));

    fireEvent.change(screen.getByPlaceholderText("e.g. Bourbon, SL28"), {
      target: { value: "Heirloom" },
    });
    // Supplier is a Combobox with allowCustom — type into it directly
    const supplierCombobox = screen.getByPlaceholderText("e.g. Sweet Maria's");
    await user.type(supplierCombobox, "Sweet Marias");
    fireEvent.change(screen.getByPlaceholderText("Supplier's description of this bean"), {
      target: { value: "A bright and fruity Ethiopian heirloom" },
    });

    await user.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledOnce();
    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.name).toBe("Ethiopia Yirgacheffe");
    expect(savedBean.origin).toBe("Yirgacheffe, Ethiopia");
    expect(savedBean.process).toBe("Natural");
    expect(savedBean.variety).toBe("Heirloom");
    expect(savedBean.supplier).toBe("Sweet Marias");
    expect(savedBean.bagNotes).toBe("A bright and fruity Ethiopian heirloom");
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddBeanModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("parses supplier notes and matches flavor names", async () => {
    const user = userEvent.setup();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [
          { name: "Chocolate", category: "NUTTY_COCOA", color: "#8b4513" },
          { name: "Blueberry", category: "FRUITY", color: "#6a5acd" },
          { name: "Citrus", category: "FRUITY", color: "#ffd700" },
        ],
      },
    });
    render(<AddBeanModal {...defaultProps} flavors={flavors} />);

    const cuppingTextarea = screen.getByPlaceholderText(
      "Supplier's description of this bean",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and blueberry with citrus" },
    });

    await user.click(screen.getByText("Parse Flavors"));

    // Should show matched flavor pills
    const pills = screen.getAllByTestId("flavor-pill");
    const pillNames = pills.map((p) => {
      const nameSpan = p.querySelector("[class*=name]");
      return nameSpan?.textContent?.trim();
    });
    expect(pillNames).toContain("Chocolate");
    expect(pillNames).toContain("Blueberry");
    expect(pillNames).toContain("Citrus");
  });

  it("includes matched flavors in saved data", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [
          { name: "Chocolate", category: "NUTTY_COCOA", color: "#8b4513" },
          { name: "Caramel", category: "SWEET", color: "#c4862a" },
        ],
      },
    });
    render(<AddBeanModal {...defaultProps} onSave={onSave} flavors={flavors} />);

    await fillRequiredFields(user);

    // Parse supplier notes
    const cuppingTextarea = screen.getByPlaceholderText(
      "Supplier's description of this bean",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and caramel" },
    });
    await user.click(screen.getByText("Parse Flavors"));

    await user.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledOnce();
    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.suggestedFlavors).toContain("Chocolate");
    expect(savedBean.suggestedFlavors).toContain("Caramel");
  });

  it("allows removing matched flavors", async () => {
    const user = userEvent.setup();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [
          { name: "Blueberry", category: "FRUITY", color: "#6a5acd" },
          { name: "Chocolate", category: "NUTTY_COCOA", color: "#8b4513" },
          { name: "Dark Chocolate", category: "NUTTY_COCOA", color: "#3d1c02" },
        ],
      },
    });
    render(<AddBeanModal {...defaultProps} flavors={flavors} />);

    const cuppingTextarea = screen.getByPlaceholderText(
      "Supplier's description of this bean",
    );
    fireEvent.change(cuppingTextarea, {
      target: { value: "chocolate and blueberry" },
    });
    await user.click(screen.getByText("Parse Flavors"));

    // Should have 3 matched pills: Blueberry, Chocolate, Dark Chocolate
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(3);

    // Remove one
    const removeBtn = screen.getByLabelText("Remove Chocolate");
    await user.click(removeBtn);

    // Should have 2 remaining
    const remainingPills = screen.getAllByTestId("flavor-pill");
    expect(remainingPills).toHaveLength(2);
  });

  it("one Supplier Notes field feeds both bagNotes and flavor parsing", async () => {
    // Consolidation guard: a single textarea serves as the supplier description
    // (saved as bagNotes) AND the parse input. Regression prevention — the
    // modal used to have two separate fields that confused users and drifted
    // apart in intent.
    const user = userEvent.setup();
    const onSave = vi.fn();
    mockParseNotes.mockResolvedValue({
      data: {
        parseSupplierNotes: [
          { name: "Blueberry", category: "FRUITY", color: "#6a5acd" },
          { name: "Chocolate", category: "NUTTY_COCOA", color: "#8b4513" },
        ],
      },
    });
    render(<AddBeanModal {...defaultProps} onSave={onSave} flavors={flavors} />);

    await fillRequiredFields(user);

    // Exactly one "Supplier Notes" label + one matching textarea in the modal
    const labels = screen.getAllByText(/^Supplier Notes$/);
    expect(labels).toHaveLength(1);
    expect(screen.queryByPlaceholderText(/paste tasting notes/i)).toBeNull();

    const supplierField = screen.getByPlaceholderText("Supplier's description of this bean");
    const description = "Complex bright cup with blueberry and chocolate finish";
    fireEvent.change(supplierField, { target: { value: description } });

    // Parse Flavors operates on the same field
    await user.click(screen.getByText("Parse Flavors"));
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(2);

    // Save: bagNotes is the literal text from the supplier description field
    await user.click(screen.getByText("Save"));
    const saved = onSave.mock.calls[0]![0];
    expect(saved.bagNotes).toBe(description);
    expect(saved.suggestedFlavors).toContain("Blueberry");
    expect(saved.suggestedFlavors).toContain("Chocolate");
  });

  it("Parse Flavors button is disabled until text is entered", () => {
    render(<AddBeanModal {...defaultProps} flavors={flavors} />);
    const btn = screen.getByText("Parse Flavors") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    const supplierField = screen.getByPlaceholderText("Supplier's description of this bean");
    fireEvent.change(supplierField, { target: { value: "blueberry notes" } });
    expect(btn.disabled).toBe(false);
  });

  it("shows required field indicators", () => {
    render(<AddBeanModal {...defaultProps} />);

    const requiredMarkers = screen.getAllByText("*");
    expect(requiredMarkers).toHaveLength(3); // Name, Origin, Process
  });

  it("does not include optional fields when empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AddBeanModal {...defaultProps} onSave={onSave} />);

    await fillRequiredFields(user);

    await user.click(screen.getByText("Save"));

    const savedBean = onSave.mock.calls[0]![0];
    expect(savedBean.variety).toBeUndefined();
    expect(savedBean.supplier).toBeUndefined();
    expect(savedBean.score).toBeUndefined();
    expect(savedBean.notes).toBeUndefined();
    expect(savedBean.bagNotes).toBeUndefined();
    expect(savedBean.suggestedFlavors).toBeUndefined();
  });
});
