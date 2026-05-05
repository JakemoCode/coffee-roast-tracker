import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithCache } from "../../../../test/helpers/cacheHelpers";
import { BeanCard, BEAN_CARD_FIELDS } from "../BeanCard";

interface TestBeanData {
  __typename: "Bean";
  id: string;
  name: string;
  origin: string | null;
  process: string | null;
  suggestedFlavors: string[];
}

const testBean: TestBeanData = {
  __typename: "Bean",
  id: "bean-123",
  name: "Ethiopia Yirgacheffe",
  origin: "Ethiopia",
  process: "Washed",
  suggestedFlavors: ["Blueberry", "Chocolate", "Citrus", "Floral", "Honey"],
};

function renderBeanCard(
  beanData: TestBeanData = testBean,
  props: Partial<{ roastCount: number; avgRating: number }> = {},
) {
  return renderWithCache(
    <BeanCard
      beanRef={{ __typename: "Bean", id: beanData.id }}
      roastCount={props.roastCount}
      avgRating={props.avgRating}
    />,
    [{ fragment: BEAN_CARD_FIELDS, data: beanData as unknown as Record<string, unknown> }],
  );
}

describe("BeanCard", () => {
  it("renders with data-testid", () => {
    renderBeanCard();
    expect(screen.getByTestId("bean-card")).toBeInTheDocument();
  });

  it("renders bean name, origin, and process", () => {
    renderBeanCard();
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText(/Ethiopia · Washed/)).toBeInTheDocument();
  });

  it("renders roast count", () => {
    renderBeanCard(testBean, { roastCount: 12 });
    expect(screen.getByText("12 roasts")).toBeInTheDocument();
  });

  it("renders star rating", () => {
    renderBeanCard(testBean, { avgRating: 4.5 });
    expect(screen.getByTestId("star-rating")).toBeInTheDocument();
  });

  it("renders with minimal props", () => {
    const minBean = {
      __typename: "Bean" as const,
      id: "bean-min",
      name: "Simple Bean",
      origin: null,
      process: null,
      suggestedFlavors: [],
    };
    renderBeanCard(minBean);
    expect(screen.getByText("Simple Bean")).toBeInTheDocument();
    expect(screen.queryByTestId("flavor-pill")).not.toBeInTheDocument();
    expect(screen.queryByTestId("star-rating")).not.toBeInTheDocument();
  });

  it("limits visible flavor pills to 3 and shows overflow count", () => {
    renderBeanCard();
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(3);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("does not show overflow when flavors are within limit", () => {
    const fewFlavorsBean = {
      __typename: "Bean" as const,
      id: "bean-few",
      name: "Few Flavors",
      origin: null,
      process: null,
      suggestedFlavors: ["Chocolate", "Citrus"],
    };
    renderBeanCard(fewFlavorsBean);
    const pills = screen.getAllByTestId("flavor-pill");
    expect(pills).toHaveLength(2);
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("links to the correct bean detail page", () => {
    renderBeanCard();
    const link = screen.getByTestId("bean-card");
    expect(link).toHaveAttribute("href", "/beans/bean-123");
  });

  it("displays singular roast count correctly", () => {
    const oneRoastBean = {
      __typename: "Bean" as const,
      id: "bean-one",
      name: "One Roast",
      origin: null,
      process: null,
      suggestedFlavors: [],
    };
    renderBeanCard(oneRoastBean, { roastCount: 1 });
    expect(screen.getByText("1 roast")).toBeInTheDocument();
  });

  it("does not render details line when origin and process are absent", () => {
    const noDetailsBean = {
      __typename: "Bean" as const,
      id: "bean-no-details",
      name: "No Details",
      origin: null,
      process: null,
      suggestedFlavors: [],
    };
    const { container } = renderBeanCard(noDetailsBean);
    expect(
      container.querySelector("[class*=details]")
    ).not.toBeInTheDocument();
  });
});
