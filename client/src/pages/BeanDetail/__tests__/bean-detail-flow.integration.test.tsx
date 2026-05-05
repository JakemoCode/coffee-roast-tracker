import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuthState } from "../../../lib/useAuthState";
import { BeanDetailPage } from "../BeanDetailPage";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";

/**
 * Integration tests for BeanDetailPage — real Apollo Client wired to MSW.
 *
 * Covers user stories:
 *   US-BD-1  Anonymous read-only view
 *   US-BD-2  Owner: edit metadata (save)
 *   US-BD-3  Owner: edit metadata (cancel — dead-end detection)
 *   US-BD-4  Owner: paste + save supplier notes
 *   US-BD-5  Bean not found
 *   US-BD-6  Roast row click navigates
 */

// ---- Module mocks ----

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---- Helpers ----

const mockedUseAuth = vi.mocked(useAuthState);

function setupAnonymous() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function setupOwner() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: true,
    isLoaded: true,
    userId: "user-1",
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function renderBeanDetail(beanId = "bean-1") {
  return renderWithProviders(<BeanDetailPage />, {
    route: `/beans/${beanId}`,
    path: "/beans/:id",
  });
}

async function waitForBeanLoaded() {
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument(),
  );
}

// ---- Tests ----

describe("BeanDetailPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- US-BD-1: Anonymous read-only view ----

  it("US-BD-1: anonymous user sees bean heading and metadata, no edit button, no supplier paste", async () => {
    setupAnonymous();
    renderBeanDetail();

    await waitForBeanLoaded();

    expect(screen.getByTestId("bean-metadata")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();

    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("supplier-paste")).not.toBeInTheDocument();
  });

  // ---- US-BD-2: Owner: edit metadata (save) ----

  it("US-BD-2: owner clicks Edit, changes origin, saves, edit mode closes", async () => {
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();

    await waitForBeanLoaded();

    await user.click(screen.getByTestId("edit-btn"));

    const originInput = await screen.findByRole("textbox", { name: /^Origin$/i });
    expect(originInput).toHaveValue("Ethiopia");

    await user.clear(originInput);
    await user.type(originInput, "Kenya");

    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /^Origin$/i }),
      ).not.toBeInTheDocument(),
    );
  });

  // ---- US-BD-3: Owner: edit metadata (cancel — dead-end detection) ----

  it("US-BD-3: owner clicks Edit then Cancel, edit mode closes, still on page", async () => {
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();

    await waitForBeanLoaded();

    await user.click(screen.getByTestId("edit-btn"));
    await screen.findByRole("textbox", { name: /^Origin$/i });

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /^Origin$/i }),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.getByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });

  // ---- US-BD-4: Owner: paste supplier notes ----

  it("US-BD-4: owner pastes supplier notes, parses flavors, saves, textarea clears", async () => {
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();

    await waitForBeanLoaded();

    expect(screen.getByTestId("supplier-paste")).toBeInTheDocument();

    const textarea = screen.getByRole("textbox", {
      name: /Supplier notes text/i,
    });
    await user.type(textarea, "jasmine blueberry caramel");

    await user.click(screen.getByRole("button", { name: /^Parse$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Save Supplier Notes/i }),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /Save Supplier Notes/i }),
    );

    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  // ---- US-BD-5: Bean not found ----

  it("US-BD-5: renders bean-not-found when bean ID does not exist", async () => {
    setupAnonymous();
    renderBeanDetail("non-existent-id");

    await waitFor(() =>
      expect(screen.getByTestId("bean-not-found")).toBeInTheDocument(),
    );

    expect(screen.getByText(/Bean not found/i)).toBeInTheDocument();
  });

  // ---- US-BD-6: Roast row click navigates ----

  it("US-BD-6: clicking a roast row navigates to /roasts/:id", async () => {
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();

    await waitForBeanLoaded();

    const roastSection = await screen.findByTestId("roast-history");
    const rows = await within(roastSection).findAllByRole("row");
    // First row is header; click first data row
    await user.click(rows[1]!);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/roasts\//),
      ),
    );
  });
});
