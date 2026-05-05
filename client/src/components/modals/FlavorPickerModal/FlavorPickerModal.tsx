import { useState, useMemo } from "react";
import { Modal } from "../Modal";
import { FlavorPill } from "../../FlavorPill";
import styles from "./FlavorPickerModal.module.css";
import { graphql } from "../../../graphql/graphql";
import type { FragmentOf } from "../../../graphql/graphql";

export const FLAVOR_DESCRIPTOR_FIELDS = graphql(`
  fragment FlavorDescriptorFields on FlavorDescriptor @_unmask {
    id
    name
    category
    color
    isOffFlavor
  }
`);

export type FlavorDescriptor = FragmentOf<typeof FLAVOR_DESCRIPTOR_FIELDS>;

interface FlavorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "flavors" | "off-flavors";
  descriptors: FlavorDescriptor[];
  selectedIds: string[];
  onSave: (selectedIds: string[]) => void;
  onCreateDescriptor?: (name: string, category: string) => void;
}

const CATEGORIES = [
  "Floral",
  "Honey",
  "Sugars",
  "Caramel",
  "Fruits",
  "Citrus",
  "Berry",
  "Cocoa",
  "Nuts",
  "Rustic",
  "Spice",
  "Body",
] as const;

export function FlavorPickerModal({
  isOpen,
  onClose,
  mode,
  descriptors,
  selectedIds,
  onSave,
  onCreateDescriptor,
}: FlavorPickerModalProps) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(
    () => new Set(selectedIds),
  );
  const [searchText, setSearchText] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<string>(CATEGORIES[0]);

  const title = mode === "flavors" ? "Select Flavors" : "Select Off-Flavors";

  const filtered = useMemo(() => {
    if (!searchText) return descriptors;
    const lower = searchText.toLowerCase();
    return descriptors.filter((d) => d.name.toLowerCase().includes(lower));
  }, [descriptors, searchText]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlavorDescriptor[]>();
    for (const d of filtered) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return map;
  }, [filtered]);

  const selectedDescriptors = useMemo(
    () => descriptors.filter((d) => localSelected.has(d.id)),
    [descriptors, localSelected],
  );

  function toggleDescriptor(id: string) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function handleSave() {
    onSave(Array.from(localSelected));
  }

  function handleCreateCustom() {
    if (!customName.trim() || !onCreateDescriptor) return;
    onCreateDescriptor(customName.trim(), customCategory);
    setCustomName("");
  }

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
      >
        Save
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div className={styles.content} data-testid="flavor-picker-modal">
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search descriptors..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search descriptors"
        />

        <div className={styles.selectedSection}>
          <div className={styles.selectedHeader}>
            Selected ({localSelected.size})
          </div>
          {selectedDescriptors.length > 0 ? (
            <div className={styles.selectedPills}>
              {selectedDescriptors.map((d) => (
                <FlavorPill
                  key={d.id}
                  name={d.name}
                  color={d.color}
                  variant={d.isOffFlavor ? "off-flavor" : "default"}
                  onRemove={() => toggleDescriptor(d.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptySelected}>None selected</div>
          )}
        </div>

        {Array.from(grouped.entries()).map(([category, items]) => {
          const isCollapsed = collapsedCategories.has(category);
          return (
            <div
              key={category}
              className={styles.categoryGroup}
              data-testid={`category-${category}`}
            >
              <button
                type="button"
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category)}
                aria-expanded={!isCollapsed}
              >
                <span
                  className={`${styles.chevron} ${!isCollapsed ? styles.chevronOpen : ""}`}
                >
                  &#9654;
                </span>
                {category}
              </button>
              {!isCollapsed && (
                <div className={styles.categoryPills}>
                  {items.map((d) => {
                    const isSelected = localSelected.has(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`${styles.descriptorBtn} ${isSelected ? styles.descriptorBtnSelected : ""}`}
                        onClick={() => toggleDescriptor(d.id)}
                        aria-pressed={isSelected}
                      >
                        <FlavorPill
                          name={d.name}
                          color={d.color}
                          variant={d.isOffFlavor ? "off-flavor" : "default"}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {onCreateDescriptor && (
          <div className={styles.createSection}>
            <span className={styles.createLabel}>Create custom</span>
            <div className={styles.createRow}>
              <input
                type="text"
                className={styles.createInput}
                placeholder="Descriptor name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                aria-label="Custom descriptor name"
              />
              <select
                className={styles.categorySelect}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                aria-label="Custom descriptor category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.addBtn}
                onClick={handleCreateCustom}
                disabled={!customName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
