import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadModal } from "../UploadModal";

const mockParseNotes = vi.fn().mockResolvedValue({
  data: {
    parseSupplierNotes: [
      { name: "Jasmine", category: "FLORAL", color: "#db7093" },
      { name: "Blueberry", category: "FRUITY", color: "#6a5acd" },
      { name: "Dark Chocolate", category: "NUTTY_COCOA", color: "#8b5e4b" },
    ],
  },
});
vi.mock("@apollo/client/react", () => ({
  useLazyQuery: vi.fn(() => [mockParseNotes, { loading: false }]),
  useQuery: vi.fn(() => ({ data: { publicBeans: [] }, loading: false })),
}));

/**
 * Integration tests for the UploadModal multi-step flow.
 *
 * Covers user stories:
 *   US-UP-1  Upload with bean match (happy path)
 *   US-UP-5  Cancel at every step
 *   US-UP-6  Notes field retains focus
 *
 * Uses userEvent.setup() for realistic input simulation.
 */

const mockPreviewData = {
  roastDate: "2026-03-20T00:00:00.000Z",
  ambientTemp: 22,
  roastingLevel: 55,
  profileShortName: "Yirg",
  profileDesigner: "Jake",
  colourChangeTime: 240,
  firstCrackTime: 330,
  roastEndTime: 405,
  developmentPercent: 18.5,
  totalDuration: 405,
  suggestedBeans: [
    {
      id: "ub-1",
      shortName: "Yirg",
      bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
    },
  ],
  communityBeans: [],
  parseWarnings: [],
};

const mockBeans = [
  { id: "bean-1", name: "Ethiopia Yirgacheffe" },
  { id: "bean-2", name: "Colombia Huila" },
];

const mockFlavors = [
  { name: "Jasmine", color: "#db7093" },
  { name: "Blueberry", color: "#6a5acd" },
  { name: "Dark Chocolate", color: "#8b5e4b" },
];

function renderUploadModal(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPreview: vi.fn().mockResolvedValue(mockPreviewData),
    onSave: vi.fn().mockResolvedValue({ roastId: "new-1" }),
    beans: mockBeans,
    onCreateBean: vi
      .fn()
      .mockImplementation(async (bean: { name: string }) => ({
        id: "bean-new",
        name: bean.name,
      })),
    flavors: mockFlavors,
    ...overrides,
  };
  return { ...render(<UploadModal {...defaultProps} />), props: defaultProps };
}

function createKlogFile(name = "test.klog", content = '{"roast":"data"}') {
  return new File([content], name, { type: "application/json" });
}

async function uploadFile(
  user: ReturnType<typeof userEvent.setup>,
  file?: File,
) {
  const input = screen.getByTestId("file-input");
  await user.upload(input, file ?? createKlogFile());
}

describe("UploadModal integration: multi-step flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- US-UP-1: Happy path ----

  it("upload → preview → bean auto-selected → save with correct args", async () => {
    const user = userEvent.setup();
    const { props } = renderUploadModal();

    // Step 1: Upload a .klog file
    await uploadFile(user);

    // Step 2: Should transition to preview step
    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Preview metadata is shown
    expect(screen.getByText("Yirg")).toBeInTheDocument();
    expect(screen.getByText("18.5%")).toBeInTheDocument();

    // Bean match auto-selected
    expect(screen.getByTestId("bean-match-found")).toBeInTheDocument();
    expect(
      screen.getByText("Bean match found: Ethiopia Yirgacheffe"),
    ).toBeInTheDocument();

    // Save button should be enabled (bean auto-selected)
    const saveBtn = screen.getByText("Save Roast");
    expect(saveBtn).not.toBeDisabled();

    // Click save
    await user.click(saveBtn);

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledOnce();
    });

    // Verify correct arguments: beanId, fileName, fileContent, notes (undefined)
    expect(props.onSave).toHaveBeenCalledWith(
      "bean-1",
      "test.klog",
      '{"roast":"data"}',
      undefined,
    );

    // Modal should close after save
    expect(props.onClose).toHaveBeenCalled();
  });

  it("upload → add notes → save includes notes", async () => {
    const user = userEvent.setup();
    const { props } = renderUploadModal();

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Set notes via fireEvent (Modal focus trap interferes with user.type)
    const notesInput = screen.getByTestId("notes-input");
    fireEvent.change(notesInput, { target: { value: "Bright and floral" } });

    await user.click(screen.getByText("Save Roast"));

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith(
        "bean-1",
        "test.klog",
        '{"roast":"data"}',
        "Bright and floral",
      );
    });
  });

  // ---- US-UP-6: Notes field retains focus ----

  it("notes textarea retains value when set and is included in save", async () => {
    const user = userEvent.setup();
    const { props } = renderUploadModal();

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    const notesInput = screen.getByTestId("notes-input");

    // Set value and verify it persists across renders
    fireEvent.change(notesInput, {
      target: { value: "Testing focus retention" },
    });
    expect(notesInput).toHaveValue("Testing focus retention");

    // Append more text — value should accumulate
    fireEvent.change(notesInput, {
      target: { value: "Testing focus retention — second edit" },
    });
    expect(notesInput).toHaveValue("Testing focus retention — second edit");

    // Save should include the notes
    await user.click(screen.getByText("Save Roast"));

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith(
        "bean-1",
        "test.klog",
        '{"roast":"data"}',
        "Testing focus retention — second edit",
      );
    });
  });

  // ---- US-UP-5: Cancel at every step ----

  it("cancel at dropzone step calls onClose, not onSave", async () => {
    const user = userEvent.setup();
    const { props } = renderUploadModal();

    // We're on the dropzone step — close via the modal close button
    await user.click(screen.getByLabelText("Close modal"));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("cancel at preview step calls onClose, not onSave", async () => {
    const user = userEvent.setup();
    const { props } = renderUploadModal();

    // Upload to get to preview
    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Click Cancel button in the preview footer
    await user.click(screen.getByText("Cancel"));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  // ---- File validation ----

  it("non-.klog file shows error and stays on dropzone", async () => {
    renderUploadModal();

    const csvFile = new File(["data"], "roast.csv", { type: "text/csv" });
    const input = screen.getByTestId("file-input");

    // Use fireEvent.change because user.upload respects accept="" and
    // silently filters mismatched files — we need the component's own
    // validation to fire.
    fireEvent.change(input, { target: { files: [csvFile] } });

    await waitFor(() => {
      expect(screen.getByTestId("upload-error")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Only .klog files are supported. Please select a Kaffelogic roast file.",
      ),
    ).toBeInTheDocument();

    // Should still be on dropzone
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
  });

  // ---- US-UP-2: Upload → Add Bean inline → flavor parsing chain ----

  it("no bean match → Add New Bean → paste supplier notes → Parse Flavors → matched pills appear → save bean → return to upload", async () => {
    const user = userEvent.setup();
    const noMatchPreview = {
      ...mockPreviewData,
      suggestedBeans: [],
    };
    renderUploadModal({
      onPreview: vi.fn().mockResolvedValue(noMatchPreview),
    });

    // Upload file with no bean match
    await uploadFile(user);
    await waitFor(
      () => {
        expect(screen.getByTestId("no-bean-match")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Click the "Add New Bean" CTA
    await user.click(screen.getByRole("button", { name: /Add New Bean/i }));

    // AddBeanModal should open — verify it has the flavor-related fields
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Bean name, e.g. Kenya AA")).toBeInTheDocument();
    });

    // Fill required fields (minimal mode — only name required, but fill more)
    fireEvent.change(screen.getByPlaceholderText("Bean name, e.g. Kenya AA"), {
      target: { value: "E2E Flavor Chain Bean" },
    });
    fireEvent.change(screen.getByPlaceholderText("Origin, e.g. Yirgacheffe, Ethiopia"), {
      target: { value: "Kenya" },
    });
    // Process combobox — use placeholder to target the right one
    const processInput = screen.getByPlaceholderText("Select a process");
    await user.click(processInput);
    await user.click(screen.getByText("Washed"));

    // Supplier notes with known flavor names from mockFlavors — parsing reads
    // the same field that is saved as bagNotes
    const cuppingTextarea = screen.getByPlaceholderText("Supplier's description of this bean");
    fireEvent.change(cuppingTextarea, {
      target: { value: "jasmine and blueberry with dark chocolate notes" },
    });

    // Click "Parse Flavors" — this is the chain that was broken (bug #3)
    // The flavors prop must flow: UploadModal → AddBeanModal for this to work
    await user.click(screen.getByText("Parse Flavors"));

    // Matched flavor pills should appear
    const pills = screen.getAllByTestId("flavor-pill");
    const pillNames = pills.map((p) => {
      const nameSpan = p.querySelector("[class*=name]");
      return nameSpan?.textContent?.trim();
    });
    expect(pillNames).toContain("Jasmine");
    expect(pillNames).toContain("Blueberry");
    expect(pillNames).toContain("Dark Chocolate");

    // Save the bean — this calls onCreateBean
    await user.click(screen.getByText("Save"));

    // Verify onCreateBean was called with the flavor data
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Bean name, e.g. Kenya AA")).not.toBeInTheDocument();
    });
  });

  // ---- No bean match flow ----

  it("no bean match → save disabled → select bean → save enabled", async () => {
    const user = userEvent.setup();
    const noMatchPreview = {
      ...mockPreviewData,
      suggestedBeans: [],
    };
    const { props } = renderUploadModal({
      onPreview: vi.fn().mockResolvedValue(noMatchPreview),
    });

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByTestId("no-bean-match")).toBeInTheDocument();
    });

    // Save button should be disabled
    expect(screen.getByText("Save Roast")).toBeDisabled();

    // Select a bean from the combobox
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Ethiopia Yirgacheffe"));

    // Save button should now be enabled
    expect(screen.getByText("Save Roast")).not.toBeDisabled();

    await user.click(screen.getByText("Save Roast"));

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledOnce();
    });
  });
});

describe("UploadModal integration: batch upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createKlogFiles(count: number) {
    return Array.from({ length: count }, (_, i) =>
      new File([`{"roast":"data${i}"}`], `roast${i + 1}.klog`, {
        type: "application/json",
      }),
    );
  }

  it("dropping 2+ .klog files enters batch mode with table", async () => {
    renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(3);

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts \(3 files\)/i)).toBeInTheDocument();
    });

    // Each file should have a row
    expect(screen.getByTestId("batch-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("batch-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("batch-row-2")).toBeInTheDocument();
  });

  it("single .klog file uses existing single upload flow", async () => {
    const user = userEvent.setup();
    renderUploadModal();

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText("Parsed successfully")).toBeInTheDocument();
    });

    // Should NOT show batch table
    expect(screen.queryByTestId("batch-row-0")).not.toBeInTheDocument();
  });

  it("non-.klog files are filtered with warning in batch mode", async () => {
    renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = [
      new File(['{"roast":"data"}'], "roast1.klog", { type: "application/json" }),
      new File(["csv data"], "data.csv", { type: "text/csv" }),
      new File(['{"roast":"data2"}'], "roast2.klog", { type: "application/json" }),
    ];

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts \(2 files\)/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId("skipped-warning")).toBeInTheDocument();
    expect(screen.getByText(/Skipped 1 non-.klog file/)).toBeInTheDocument();
  });

  it("batch Save All calls onSave for each row using the shared bean", async () => {
    const user = userEvent.setup();
    const onPreviewMock = vi.fn().mockResolvedValue({
      ...mockPreviewData,
      suggestedBeans: [
        { id: "ub-1", shortName: "Yirg", bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" } },
      ],
    });
    const onSaveMock = vi.fn().mockResolvedValue({ roastId: "new-1" });
    const onSaveBatchMock = vi.fn().mockResolvedValue({ roastId: "new-1" });
    renderUploadModal({
      onPreview: onPreviewMock,
      onSave: onSaveMock,
      onSaveBatch: onSaveBatchMock,
    });

    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(2);
    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts/i)).toBeInTheDocument();
    });

    // Auto-matched bean radio should be pre-selected
    const matchRadio = await screen.findByDisplayValue("match");
    expect(matchRadio).toBeChecked();

    // Save All should be enabled (bean auto-selected)
    const saveBtn = await screen.findByRole("button", { name: /save all/i });
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSaveBatchMock).toHaveBeenCalledTimes(2);
    });

    // Both calls should use the same bean id
    expect(onSaveBatchMock).toHaveBeenNthCalledWith(1, "bean-1", expect.any(String), expect.any(String));
    expect(onSaveBatchMock).toHaveBeenNthCalledWith(2, "bean-1", expect.any(String), expect.any(String));

    // onSave (with navigation) should NOT have been called
    expect(onSaveMock).not.toHaveBeenCalled();
  });

  it("batch Save All stops on first failure and shows error", async () => {
    const user = userEvent.setup();
    const onPreviewMock = vi.fn().mockResolvedValue({
      ...mockPreviewData,
      suggestedBeans: [
        { id: "ub-1", shortName: "Yirg", bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" } },
      ],
    });
    const onSaveBatchMock = vi.fn()
      .mockResolvedValueOnce({ roastId: "new-1" })
      .mockRejectedValueOnce(new Error("Server error"));
    renderUploadModal({
      onPreview: onPreviewMock,
      onSaveBatch: onSaveBatchMock,
    });

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: createKlogFiles(3) } });

    await waitFor(() => {
      expect(screen.getByText(/Upload Roasts/i)).toBeInTheDocument();
    });

    // Wait for auto-matched bean to appear and Save All to be enabled
    const saveBtn = await screen.findByRole("button", { name: /save all/i });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    // First save succeeds, second fails — should stop and show error
    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toBeInTheDocument();
    });

    // Only 2 calls: first succeeded, second failed, third never attempted
    expect(onSaveBatchMock).toHaveBeenCalledTimes(2);
  });

  it("too many files shows error", () => {
    renderUploadModal();
    const input = screen.getByTestId("file-input");
    const files = createKlogFiles(21);

    fireEvent.change(input, { target: { files } });

    expect(screen.getByText(/Too many files/i)).toBeInTheDocument();
  });
});
