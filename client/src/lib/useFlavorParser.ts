import { useMemo, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { PARSE_SUPPLIER_NOTES_QUERY } from "../graphql/operations";

interface UseFlavorParserOptions {
  /** Catalogue of flavors the combobox can offer. */
  availableFlavors: readonly { name: string; color: string }[];
  /** Flavor names that are already saved elsewhere — excluded from
   *  `availableOptions` so the combobox doesn't offer duplicates. Compared
   *  case-insensitively. Defaults to empty. */
  alreadySelected?: readonly string[];
}

export interface UseFlavorParserResult {
  /** Free-text supplier/cupping notes the user is editing. */
  text: string;
  setText: (value: string) => void;
  /** Flavor names currently picked — server matches + manual adds. */
  parsed: string[];
  /** True once a non-empty parse has been issued; lets callers render a
   *  "no matches found" fallback without re-deriving the flag. */
  parseAttempted: boolean;
  /** True while the parse query is in flight. */
  isParsing: boolean;
  /** Fire the parse query for the current text. No-op on empty/whitespace. */
  parse: () => Promise<void>;
  /** Add a flavor by name. Idempotent. */
  addManual: (name: string) => void;
  /** Drop a flavor by name. */
  remove: (name: string) => void;
  /** Catalogue minus anything in `parsed` or `alreadySelected`,
   *  shaped as Combobox options. */
  availableOptions: { value: string; label: string }[];
  /** Clear text, parsed, and parseAttempted. */
  reset: () => void;
}

export function useFlavorParser({
  availableFlavors,
  alreadySelected = [],
}: UseFlavorParserOptions): UseFlavorParserResult {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const [parseAttempted, setParseAttempted] = useState(false);
  const [parseNotes, { loading: isParsing }] = useLazyQuery(PARSE_SUPPLIER_NOTES_QUERY);

  async function parse() {
    if (!text.trim()) return;
    const { data } = await parseNotes({ variables: { text } });
    if (data?.parseSupplierNotes) {
      setParsed(data.parseSupplierNotes.map((d) => d.name));
      setParseAttempted(true);
    }
  }

  function addManual(name: string) {
    if (!name) return;
    setParsed((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  function remove(name: string) {
    setParsed((prev) => prev.filter((f) => f !== name));
  }

  function reset() {
    setText("");
    setParsed([]);
    setParseAttempted(false);
  }

  const availableOptions = useMemo(() => {
    const excluded = new Set<string>();
    for (const name of parsed) excluded.add(name.toLowerCase());
    for (const name of alreadySelected) excluded.add(name.toLowerCase());
    return availableFlavors
      .filter((f) => !excluded.has(f.name.toLowerCase()))
      .map((f) => ({ value: f.name, label: f.name }));
  }, [availableFlavors, parsed, alreadySelected]);

  return {
    text,
    setText,
    parsed,
    parseAttempted,
    isParsing,
    parse,
    addManual,
    remove,
    availableOptions,
    reset,
  };
}
