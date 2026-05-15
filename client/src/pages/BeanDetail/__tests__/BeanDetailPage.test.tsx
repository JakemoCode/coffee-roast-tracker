import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { graphql as mswGraphql, HttpResponse, delay } from "msw";
import { useAuthState } from "../../../lib/useAuthState";
import { BeanDetailPage } from "../BeanDetailPage";
import { renderWithProviders } from "../../../../test/helpers/renderWithProviders";
import { server } from "../../../../test/mocks/server";

/**
 * BeanDetailPage — real Apollo Client wired to MSW.
 *
 * Default MSW (client/test/mocks/schema-handler.ts):
 *   bean(id: "bean-1") → Ethiopia Yirgacheffe (isLocked: false)
 *   myBeans → 2 user beans, one for bean-1 with shortName "Yirg"
 *   roastsByBean(beanId: "bean-1") → roast-1 (only)
 *
 * Ownership is computed client-side from the myBeans response.
 * "Owner" = signed-in user whose myBeans contains this bean.
 * "Non-owner" = signed-in but myBeans doesn't contain this bean
 *   (override myBeans to return [] for that case).
 */

vi.mock("../../../lib/useAuthState", () => ({
  useAuthState: vi.fn(),
}));

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

function setupAnonymous() {
  mockedUseAuth.mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    getToken: vi.fn(),
    signOut: vi.fn(),
  } as ReturnType<typeof useAuthState>);
}

function setupNonOwner() {
  setupOwner();
  // A signed-in user who does not own this bean: empty myBeans.
  server.use(
    mswGraphql.query("MyBeans", () =>
      HttpResponse.json({ data: { myBeans: [] } }),
    ),
  );
}

function renderBeanDetail(beanId = "bean-1") {
  return renderWithProviders(<BeanDetailPage />, {
    route: `/beans/${beanId}`,
    path: "/beans/:id",
  });
}

async function waitForBeanLoaded() {
  await screen.findByRole("heading", { name: /Ethiopia Yirgacheffe/i });
}

/**
 * Installs an MSW handler for UpdateUserBean and returns a spy
 * that captures the variables each call was made with.
 */
function installUpdateUserBeanSpy() {
  const updateSpy = vi.fn();
  server.use(
    mswGraphql.mutation("UpdateUserBean", async ({ variables }) => {
      updateSpy(variables);
      return HttpResponse.json({
        data: {
          updateUserBean: {
            id: variables.id,
            notes: null,
            supplier: null,
            shortName: variables.shortName,
          },
        },
      });
    }),
  );
  return updateSpy;
}

/**
 * Installs a MyBeans override where the user's bean for bean-1 has
 * no shortName yet (covers the "set short name when none existed" case).
 */
function installMyBeansWithoutShortName() {
  server.use(
    mswGraphql.query("MyBeans", () =>
      HttpResponse.json({
        data: {
          myBeans: [
            {
              __typename: "UserBean",
              id: "ub-1",
              shortName: null,
              notes: null,
              supplier: null,
              bean: {
                __typename: "Bean",
                id: "bean-1",
                name: "Ethiopia Yirgacheffe",
                origin: "Ethiopia",
                process: "Washed",
                elevation: "1800m",
                variety: "Heirloom",
                sourceUrl: null,
                bagNotes: null,
                score: 88,
                cropYear: 2025,
                suggestedFlavors: ["Jasmine", "Blueberry"],
              },
            },
          ],
        },
      }),
    ),
  );
}

describe("BeanDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("shows the bean name as the heading", async () => {
    setupOwner();
    renderBeanDetail();
    expect(
      await screen.findByRole("heading", { name: /Ethiopia Yirgacheffe/i }),
    ).toBeInTheDocument();
  });

  it("shows bean metadata — origin, process, variety, score", async () => {
    setupOwner();
    renderBeanDetail();
    const metadata = await screen.findByTestId("bean-metadata");
    expect(within(metadata).getByText("Ethiopia")).toBeInTheDocument();
    expect(within(metadata).getByText("Washed")).toBeInTheDocument();
    expect(within(metadata).getByText("Heirloom")).toBeInTheDocument();
    expect(within(metadata).getByText("88")).toBeInTheDocument();
  });

  it("shows the Edit button to the bean's owner", async () => {
    setupOwner();
    renderBeanDetail();
    expect(await screen.findByTestId("edit-btn")).toBeInTheDocument();
  });

  it("hides the Edit button from non-owners", async () => {
    setupNonOwner();
    renderBeanDetail();
    await waitForBeanLoaded();
    expect(screen.queryByTestId("edit-btn")).not.toBeInTheDocument();
  });

  it("renders the roast history section", async () => {
    setupOwner();
    renderBeanDetail();
    expect(await screen.findByTestId("roast-history")).toBeInTheDocument();
  });

  it("shows the bean's supplier-note flavor pills", async () => {
    setupOwner();
    renderBeanDetail();
    const notes = await screen.findByTestId("supplier-notes");
    const pills = within(notes).getAllByTestId("flavor-pill");
    expect(pills.length).toBeGreaterThanOrEqual(2);
  });

  it("shows a loading skeleton while the bean query is in flight", async () => {
    setupOwner();
    server.use(
      mswGraphql.query("PublicBean", async () => {
        await delay("infinite");
        return HttpResponse.json({ data: null });
      }),
    );
    renderBeanDetail();
    expect(
      await screen.findByTestId("bean-detail-loading"),
    ).toBeInTheDocument();
  });

  it("shows a 'not found' state when the bean is missing", async () => {
    setupAnonymous();
    server.use(
      mswGraphql.query("PublicBean", () =>
        HttpResponse.json({ data: { bean: null } }),
      ),
    );
    renderBeanDetail("does-not-exist");
    expect(await screen.findByTestId("bean-not-found")).toBeInTheDocument();
    expect(screen.getByText(/bean not found/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when this bean has no roasts yet", async () => {
    setupOwner();
    server.use(
      mswGraphql.query("RoastsByBean", () =>
        HttpResponse.json({ data: { roastsByBean: [] } }),
      ),
    );
    renderBeanDetail();
    await waitForBeanLoaded();
    expect(
      await screen.findByText(/no roasts logged for this bean yet/i),
    ).toBeInTheDocument();
  });

  it("shows the owner's short-name card for this bean", async () => {
    setupOwner();
    renderBeanDetail();
    const card = await screen.findByTestId("short-name-card");
    expect(within(card).getByTestId("short-name-value")).toHaveTextContent(
      "Yirg",
    );
  });

  it("hides the short-name card from non-owners", async () => {
    setupNonOwner();
    renderBeanDetail();
    await waitForBeanLoaded();
    expect(screen.queryByTestId("short-name-card")).not.toBeInTheDocument();
  });

  it("opens an editable input prefilled with the current short name", async () => {
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();
    await user.click(await screen.findByTestId("edit-btn"));
    const input = (await screen.findByTestId(
      "short-name-input",
    )) as HTMLInputElement;
    expect(input.value).toBe("Yirg");
  });

  it("saving a changed short name fires the UpdateUserBean mutation", async () => {
    const updateSpy = installUpdateUserBeanSpy();
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();
    await user.click(await screen.findByTestId("edit-btn"));
    const input = await screen.findByTestId("short-name-input");
    await user.clear(input);
    await user.type(input, "EYG");
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ub-1", shortName: "EYG" }),
      );
    });
  });

  it("setting a short name when none existed fires UpdateUserBean", async () => {
    installMyBeansWithoutShortName();
    const updateSpy = installUpdateUserBeanSpy();
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();
    await user.click(await screen.findByTestId("edit-btn"));
    const input = (await screen.findByTestId(
      "short-name-input",
    )) as HTMLInputElement;
    expect(input.value).toBe("");
    await user.type(input, "EYG");
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ub-1", shortName: "EYG" }),
      );
    });
  });

  it("does NOT fire UpdateUserBean when the short name was not changed", async () => {
    const updateSpy = installUpdateUserBeanSpy();
    const user = userEvent.setup();
    setupOwner();
    renderBeanDetail();
    await user.click(await screen.findByTestId("edit-btn"));
    // No edits — just Save.
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    // After save, edit mode should close — wait for that signal.
    await waitFor(() =>
      expect(screen.queryByTestId("short-name-input")).not.toBeInTheDocument(),
    );
    // Let any in-flight mutations settle before asserting "not called" — the
    // page fires UpdateBean unconditionally on save, and we want to be sure
    // UpdateUserBean didn't sneak through after the input closed.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("shows an error state when the bean query fails", async () => {
    setupAnonymous();
    server.use(
      mswGraphql.query("PublicBean", () =>
        HttpResponse.json({ errors: [{ message: "Network error" }] }),
      ),
    );
    renderBeanDetail();
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
  });
});
