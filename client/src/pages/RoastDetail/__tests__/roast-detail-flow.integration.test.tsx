import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuthState } from "../../../lib/useAuthState";
import { RoastDetailPage } from "../RoastDetailPage";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";

/**
 * Integration tests for RoastDetailPage — real Apollo Client wired to MSW.
 *
 * Covers user stories:
 *   US-RD-1  Edit notes inline
 *   US-RD-2  Toggle public/private
 *   US-RD-3  Delete roast (confirm + cancel)
 *   US-RD-4  Edit flavors via FlavorPickerModal
 */

// ---- Module mocks ----

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

vi.mock("react-chartjs-2", () => ({
  Line: (props: Record<string, unknown>) => (
    <canvas data-testid="chart-canvas" {...props} />
  ),
}));

vi.mock("../../../lib/chartSetup", () => ({}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---- Helpers ----

const mockedUseAuth = vi.mocked(useAuthState);

function setupOwner() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user-1",
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function renderRoastDetail(roastId = "test-id") {
  return renderWithProviders(<RoastDetailPage />, {
    route: `/roasts/${roastId}`,
    path: "/roasts/:id",
  });
}

async function waitForRoastLoaded() {
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument(),
  );
}

// ---- Tests ----

describe("RoastDetailPage integration: owner flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupOwner();
  });

  // ---- US-RD-1: Edit notes inline ----

  it("US-RD-1: opens notes textarea, saves new notes, closes edit mode", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /^Edit$/i }));

    const textarea = await screen.findByRole("textbox", {
      name: /roast notes/i,
    });
    expect(textarea).toHaveValue("Great first crack, smooth development");

    await user.clear(textarea);
    await user.type(textarea, "Updated tasting notes");

    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /roast notes/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("US-RD-1: cancel notes edit closes textarea without navigating away", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /^Edit$/i }));

    await screen.findByRole("textbox", { name: /roast notes/i });

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /roast notes/i }),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });

  // ---- US-RD-2: Toggle public/private ----

  it("US-RD-2: clicking visibility toggle fires mutation and shows toast", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(
      screen.getByRole("button", { name: /Visibility:.*public/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Roast is now (private|public)/i),
      ).toBeInTheDocument(),
    );
  });

  // ---- US-RD-3A: Delete confirm ----

  it("US-RD-3A: clicking Delete opens dialog, confirming navigates to /", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    await screen.findByTestId("confirm-dialog");
    expect(
      screen.getByText(/Are you sure\? This roast will be permanently removed/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Yes, remove/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  // ---- US-RD-3B: Delete cancel ----

  it("US-RD-3B: clicking Cancel in delete dialog closes it without navigating", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    await screen.findByTestId("confirm-dialog");

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() =>
      expect(
        screen.queryByTestId("confirm-dialog"),
      ).not.toBeInTheDocument(),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });

  // ---- US-RD-4: Edit flavors ----

  it("US-RD-4: opens FlavorPickerModal, toggles a flavor, saves, closes modal", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /Edit Flavors/i }));

    await screen.findByTestId("flavor-picker-modal");

    const descriptorBtns = screen.getAllByRole("button", {
      name: /Jasmine|Rose|Caramel|Dark Chocolate|Blueberry|Honey/i,
    });
    expect(descriptorBtns.length).toBeGreaterThan(0);
    await user.click(descriptorBtns[0]!);

    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() =>
      expect(
        screen.queryByTestId("flavor-picker-modal"),
      ).not.toBeInTheDocument(),
    );
  });

  it("US-RD-4: closing FlavorPickerModal via Cancel exits without mutation error", async () => {
    const user = userEvent.setup();
    renderRoastDetail();

    await waitForRoastLoaded();

    await user.click(screen.getByRole("button", { name: /Edit Flavors/i }));

    await screen.findByTestId("flavor-picker-modal");

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() =>
      expect(
        screen.queryByTestId("flavor-picker-modal"),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });
});
