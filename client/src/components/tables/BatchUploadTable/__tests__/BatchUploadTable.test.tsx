import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchUploadTable } from "../BatchUploadTable";
import type { BatchRow } from "../BatchUploadTable";

function makeRow(overrides: Partial<BatchRow> = {}): BatchRow {
  return {
    fileName: "test.klog",
    fileContent: '{"roast":"data"}',
    preview: {
      roastDate: "2026-03-20T00:00:00.000Z",
      profileShortName: "Yirg",
      totalDuration: 405,
      developmentPercent: 18.5,
      suggestedBeans: [],
      communityBeans: [],
      parseWarnings: [],
    },
    error: null,
    saved: false,
    ...overrides,
  };
}

describe("BatchUploadTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a row for each parsed file", () => {
    const rows = [
      makeRow({ fileName: "roast1.klog" }),
      makeRow({ fileName: "roast2.klog" }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={false}
      />,
    );

    expect(screen.getByText("roast1.klog")).toBeInTheDocument();
    expect(screen.getByText("roast2.klog")).toBeInTheDocument();
  });

  it("shows error text for rows that failed to parse", () => {
    const rows = [makeRow({ error: "Invalid JSON", preview: null })];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={false}
      />,
    );

    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });

  it("Save All is disabled when canSave is false", () => {
    const rows = [makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={false}
      />,
    );

    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
  });

  it("Save All is enabled when canSave is true", () => {
    const rows = [makeRow(), makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={true}
      />,
    );

    expect(screen.getByRole("button", { name: /save all/i })).not.toBeDisabled();
  });

  it("calls onSaveAll when Save All is clicked", async () => {
    const user = userEvent.setup();
    const onSaveAll = vi.fn();
    const rows = [makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={onSaveAll}
        saving={false}
        saveProgress={null}
        canSave={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save all/i }));
    expect(onSaveAll).toHaveBeenCalledOnce();
  });

  it("shows saving progress when saving", () => {
    const rows = [makeRow(), makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={true}
        saveProgress={{ current: 1, total: 2 }}
        canSave={false}
      />,
    );

    expect(screen.getByText("Saving 1 of 2…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save all/i })).toBeDisabled();
  });

  it("error rows are excluded from Save All count", () => {
    const rows = [
      makeRow(),
      makeRow({ error: "Bad file", preview: null }),
    ];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={true}
      />,
    );

    // Only 1 valid row — Save All (1)
    expect(screen.getByRole("button", { name: /save all \(1\)/i })).not.toBeDisabled();
  });

  it("shows 'Pending' in bean column when no bean selected", () => {
    const rows = [makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={false}
      />,
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows bean name in bean column when selected", () => {
    const rows = [makeRow()];
    render(
      <BatchUploadTable
        rows={rows}
        selectedBeanName="Ethiopia Yirgacheffe"
        onSaveAll={vi.fn()}
        saving={false}
        saveProgress={null}
        canSave={true}
      />,
    );

    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
  });
});
