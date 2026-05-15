import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import type { ReactNode } from "react";
import { useFlavorParser } from "../useFlavorParser";

const FLAVORS = [
  { name: "Jasmine", color: "#db7093" },
  { name: "Blueberry", color: "#6a5acd" },
  { name: "Dark Chocolate", color: "#8b5e4b" },
  { name: "Caramel", color: "#c08040" },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "no-cache" },
      query: { fetchPolicy: "no-cache" },
    },
  });
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

function render(props: { availableFlavors: typeof FLAVORS; alreadySelected?: string[] }) {
  return renderHook(() => useFlavorParser(props), { wrapper });
}

describe("useFlavorParser", () => {
  it("starts empty and exposes every flavor as an option", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    expect(result.current.text).toBe("");
    expect(result.current.parsed).toEqual([]);
    expect(result.current.parseAttempted).toBe(false);
    expect(result.current.isParsing).toBe(false);
    expect(result.current.availableOptions.map((o) => o.value)).toEqual([
      "Jasmine",
      "Blueberry",
      "Dark Chocolate",
      "Caramel",
    ]);
  });

  it("setText updates the text state", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.setText("jasmine and blueberry"));
    expect(result.current.text).toBe("jasmine and blueberry");
  });

  it("parse() with empty text is a no-op (no query, no parseAttempted flip)", async () => {
    const { result } = render({ availableFlavors: FLAVORS });
    await act(async () => {
      await result.current.parse();
    });
    expect(result.current.parseAttempted).toBe(false);
    expect(result.current.parsed).toEqual([]);
  });

  it("parse() populates `parsed` from the MSW handler and flips parseAttempted", async () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.setText("jasmine and blueberry with dark chocolate"));
    await act(async () => {
      await result.current.parse();
    });
    await waitFor(() => {
      expect(result.current.parseAttempted).toBe(true);
    });
    // Server returns matches in catalogue order, not text-mention order.
    expect(new Set(result.current.parsed)).toEqual(
      new Set(["Jasmine", "Blueberry", "Dark Chocolate"]),
    );
  });

  it("parse() flips parseAttempted even when the server returns an empty match list", async () => {
    // Drives AddBeanModal's "no flavors matched" fallback — the only signal
    // that distinguishes "user hasn't parsed yet" from "user parsed and got
    // nothing back."
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.setText("nothing here matches the catalogue"));
    await act(async () => {
      await result.current.parse();
    });
    await waitFor(() => expect(result.current.parseAttempted).toBe(true));
    expect(result.current.parsed).toEqual([]);
  });

  it("addManual appends a flavor that isn't already in `parsed`", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.addManual("Caramel"));
    expect(result.current.parsed).toEqual(["Caramel"]);
  });

  it("addManual is idempotent — duplicates are ignored", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.addManual("Caramel"));
    act(() => result.current.addManual("Caramel"));
    expect(result.current.parsed).toEqual(["Caramel"]);
  });

  it("remove() drops a flavor from `parsed`", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.addManual("Caramel"));
    act(() => result.current.addManual("Jasmine"));
    act(() => result.current.remove("Caramel"));
    expect(result.current.parsed).toEqual(["Jasmine"]);
  });

  it("availableOptions excludes anything already in `parsed`", () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.addManual("Caramel"));
    expect(result.current.availableOptions.map((o) => o.value)).not.toContain("Caramel");
    expect(result.current.availableOptions.map((o) => o.value)).toContain("Jasmine");
  });

  it("availableOptions also excludes `alreadySelected` (case-insensitive)", () => {
    const { result } = render({
      availableFlavors: FLAVORS,
      alreadySelected: ["jasmine"],
    });
    expect(result.current.availableOptions.map((o) => o.value)).not.toContain("Jasmine");
  });

  it("reset() clears text, parsed, and parseAttempted", async () => {
    const { result } = render({ availableFlavors: FLAVORS });
    act(() => result.current.setText("blueberry"));
    await act(async () => {
      await result.current.parse();
    });
    await waitFor(() => expect(result.current.parseAttempted).toBe(true));

    act(() => result.current.reset());
    expect(result.current.text).toBe("");
    expect(result.current.parsed).toEqual([]);
    expect(result.current.parseAttempted).toBe(false);
  });
});
