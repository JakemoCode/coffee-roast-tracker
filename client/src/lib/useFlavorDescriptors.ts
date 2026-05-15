import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { graphql } from "../graphql/graphql";
import type { ResultOf } from "../graphql/graphql";
import { FLAVOR_DESCRIPTOR_FIELDS } from "../components/modals/FlavorPickerModal";

const FLAVOR_DESCRIPTORS_QUERY = graphql(`
  query FlavorDescriptors($isOffFlavor: Boolean) {
    flavorDescriptors(isOffFlavor: $isOffFlavor) {
      ...FlavorDescriptorFields
      isCustom
    }
  }
`, [FLAVOR_DESCRIPTOR_FIELDS]);

export type FlavorDescriptor =
  ResultOf<typeof FLAVOR_DESCRIPTORS_QUERY>["flavorDescriptors"][number];

interface UseFlavorDescriptorsOptions {
  /** When set, filters the catalogue to off-flavors (`true`) or
   *  regular flavors (`false`). Omit for the full catalogue. */
  isOffFlavor?: boolean;
  /** When true, suppresses the network query. `descriptors` and `colorMap`
   *  stay empty. Useful for gated UI (e.g. an owner-only picker) where
   *  fetching the catalogue for an anonymous viewer is wasted bandwidth. */
  skip?: boolean;
}

export interface UseFlavorDescriptorsResult {
  /** Catalogue rows. Empty while loading. */
  descriptors: FlavorDescriptor[];
  /** Lowercase name → color lookup. Keys are lowercased so callers
   *  don't need to normalize their input. */
  colorMap: Map<string, string>;
}

export function useFlavorDescriptors(
  options: UseFlavorDescriptorsOptions = {},
): UseFlavorDescriptorsResult {
  const { isOffFlavor, skip } = options;
  const { data } = useQuery(FLAVOR_DESCRIPTORS_QUERY, {
    variables: { isOffFlavor },
    fetchPolicy: "cache-first",
    skip,
  });

  return useMemo(() => {
    const descriptors = data?.flavorDescriptors ?? [];
    const colorMap = new Map<string, string>();
    for (const f of descriptors) colorMap.set(f.name.toLowerCase(), f.color);
    return { descriptors, colorMap };
  }, [data]);
}
