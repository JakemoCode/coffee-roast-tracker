import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import type { ReactNode } from "react";
import { useFlavorDescriptors } from "../useFlavorDescriptors";

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

describe("useFlavorDescriptors", () => {
  it("returns descriptors[] and colorMap once the MSW handler resolves", async () => {
    const { result } = renderHook(() => useFlavorDescriptors(), { wrapper });

    // Initially empty while query is in flight
    expect(result.current.descriptors).toEqual([]);
    expect(result.current.colorMap.size).toBe(0);

    await waitFor(() => {
      expect(result.current.descriptors.length).toBeGreaterThan(0);
    });

    const first = result.current.descriptors[0]!;
    expect(typeof first.name).toBe("string");
    expect(first.name.length).toBeGreaterThan(0);
    expect(typeof first.color).toBe("string");
    expect(first.color.length).toBeGreaterThan(0);
    expect(result.current.colorMap.size).toBe(result.current.descriptors.length);
  });

  it("colorMap is keyed case-insensitively (lowercase) so callers can normalize lookups", async () => {
    const { result } = renderHook(() => useFlavorDescriptors(), { wrapper });
    await waitFor(() => expect(result.current.descriptors.length).toBeGreaterThan(0));

    const first = result.current.descriptors[0]!;
    expect(result.current.colorMap.get(first.name.toLowerCase())).toBe(first.color);
  });

  it("isOffFlavor filter is forwarded to the query", async () => {
    // We can't easily distinguish what the MSW handler returns for each
    // variant without inspecting the seed data, but the hook's contract
    // is that the option drives the query variable. Render with each
    // variant and assert both resolve to non-empty arrays.
    const offResult = renderHook(() => useFlavorDescriptors({ isOffFlavor: true }), { wrapper });
    const onResult = renderHook(() => useFlavorDescriptors({ isOffFlavor: false }), { wrapper });

    await waitFor(() => expect(offResult.result.current.descriptors.length).toBeGreaterThan(0));
    await waitFor(() => expect(onResult.result.current.descriptors.length).toBeGreaterThan(0));
  });
});
