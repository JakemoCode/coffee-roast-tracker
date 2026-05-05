import { useState, useMemo } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { Modal } from "../Modal";
import { Combobox } from "../../Combobox";
import { FlavorPill } from "../../FlavorPill";
import { COFFEE_PROCESSES } from "../../../lib/coffeeProcesses";
import { PARSE_SUPPLIER_NOTES_QUERY } from "../../../graphql/operations";
import styles from "./AddBeanModal.module.css";

interface AddBeanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bean: {
    name: string;
    origin: string;
    process: string;
    shortName: string;
    variety?: string;
    supplier?: string;
    score?: number;
    notes?: string;
    bagNotes?: string;
    suggestedFlavors?: string[];
  }) => void;
  flavors?: Array<{ name: string; color: string }>;
  suppliers?: string[];
  /** When true, only name and shortName are required (used for inline creation during upload) */
  minimal?: boolean;
}

const processOptions = COFFEE_PROCESSES.map((p) => ({
  value: p,
  label: p,
}));

export function AddBeanModal({
  isOpen,
  onClose,
  onSave,
  flavors = [],
  suppliers = [],
  minimal = false,
}: AddBeanModalProps) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [process, setProcess] = useState("");
  const [variety, setVariety] = useState("");
  const [shortName, setShortName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierDescription, setSupplierDescription] = useState("");
  const [matchedFlavors, setMatchedFlavors] = useState<string[]>([]);
  const [parseAttempted, setParseAttempted] = useState(false);

  const canSave = minimal
    ? name.trim().length > 0 && shortName.trim().length > 0
    : name.trim().length > 0 &&
      origin.trim().length > 0 &&
      process.trim().length > 0 &&
      shortName.trim().length > 0;

  const [parseNotes, { loading: parsingNotes }] = useLazyQuery(PARSE_SUPPLIER_NOTES_QUERY);

  async function handleParseNotes() {
    if (!supplierDescription.trim()) return;
    const { data } = await parseNotes({ variables: { text: supplierDescription } });
    if (data?.parseSupplierNotes) {
      setMatchedFlavors(data.parseSupplierNotes.map((d) => d.name));
      setParseAttempted(true);
    }
  }

  const availableFlavors = useMemo(() => {
    const matched = new Set(matchedFlavors.map((f) => f.toLowerCase()));
    return flavors
      .filter((f) => !matched.has(f.name.toLowerCase()))
      .map((f) => ({ value: f.name, label: f.name }));
  }, [flavors, matchedFlavors]);

  function handleAddFlavor(name: string) {
    if (name && !matchedFlavors.includes(name)) {
      setMatchedFlavors((prev) => [...prev, name]);
    }
  }

  function handleSave() {
    const scoreNum = score ? parseFloat(score) : undefined;
    onSave({
      name: name.trim(),
      origin: origin.trim(),
      process: process.trim(),
      variety: variety.trim() || undefined,
      shortName: shortName.trim(),
      supplier: supplier.trim() || undefined,
      score: scoreNum && !isNaN(scoreNum) ? scoreNum : undefined,
      notes: notes.trim() || undefined,
      bagNotes: supplierDescription.trim() || undefined,
      suggestedFlavors: matchedFlavors.length > 0 ? matchedFlavors : undefined,
    });
  }

  const flavorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of flavors) {
      map.set(f.name.toLowerCase(), f.color);
    }
    return map;
  }, [flavors]);

  const footer = (
    <div className={styles.footer}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleSave}
        disabled={!canSave}
      >
        Save
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Bean" footer={footer}>
      <div className={styles.content} data-testid="add-bean-modal">
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Bean Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Bean name, e.g. Kenya AA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Origin {!minimal && <span className={styles.required}>*</span>}
          </label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Origin, e.g. Yirgacheffe, Ethiopia"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Process {!minimal && <span className={styles.required}>*</span>}
          </label>
          <Combobox
            options={processOptions}
            value={process}
            onChange={setProcess}
            placeholder="Select a process"
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Variety</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Bourbon, SL28"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Short Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Yirg, Huila"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              required
              aria-describedby="short-name-help"
            />
            <p id="short-name-help" className={styles.helpText}>
              Used to auto-match uploaded roast profiles to this bean (e.g.
              {" "}<strong>Yirg</strong> matches profiles named{" "}
              <em>YirgKonga-2026-03</em>).
            </p>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Supplier</label>
            <Combobox
              options={suppliers.map((s) => ({ value: s, label: s }))}
              value={supplier}
              onChange={setSupplier}
              placeholder="e.g. Sweet Maria's"
              allowCustom
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Score</label>
            <input
              type="number"
              className={styles.formInput}
              placeholder="e.g. 86"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Supplier Notes</label>
          <textarea
            className={styles.formTextarea}
            placeholder="Supplier's description of this bean"
            value={supplierDescription}
            onChange={(e) => setSupplierDescription(e.target.value)}
            rows={4}
          />
          <div className={styles.parseRow}>
            <button
              type="button"
              className={styles.parseBtn}
              onClick={handleParseNotes}
              disabled={parsingNotes || !supplierDescription.trim()}
            >
              {parsingNotes ? "Parsing..." : "Parse Flavors"}
            </button>
            {parseAttempted && matchedFlavors.length === 0 && (
              <span className={styles.noMatchText}>
                No flavors matched — try different terms or add flavors manually below.
              </span>
            )}
          </div>
          {matchedFlavors.length > 0 && (
            <div>
              <span className={styles.matchedLabel}>Matched flavors:</span>
              <div className={styles.matchedPills}>
                {matchedFlavors.map((name) => (
                  <FlavorPill
                    key={name}
                    name={name}
                    color={flavorColorMap.get(name.toLowerCase()) ?? "#888888"}
                    onRemove={() =>
                      setMatchedFlavors((prev) =>
                        prev.filter((f) => f !== name),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
          {flavors.length > 0 && (
            <div className={styles.addFlavorRow}>
              <Combobox
                options={availableFlavors}
                value=""
                onChange={handleAddFlavor}
                placeholder="Add a flavor..."
              />
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea
            className={styles.formTextarea}
            placeholder="Personal remarks about this bean"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
