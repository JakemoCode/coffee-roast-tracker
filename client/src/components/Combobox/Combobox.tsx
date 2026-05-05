import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./Combobox.module.css";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => {
    const match = options.find((o) => o.value === value);
    return match ? match.label : value;
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useRef(`combobox-list-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    const match = options.find((o) => o.value === value);
    setInputValue(match ? match.label : value);
  }, [value, options]);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        if (!allowCustom) {
          const match = options.find((o) => o.value === value);
          setInputValue(match ? match.label : value);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, options, value]);

  const selectOption = useCallback(
    (opt: ComboboxOption) => {
      setInputValue(opt.label);
      onChange(opt.value);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  function handleInputChange(val: string) {
    setInputValue(val);
    setActiveIndex(-1);
    setOpen(true);

    if (allowCustom) {
      onChange(val);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      e.preventDefault();
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          const selected = filtered[activeIndex];
          if (selected) {
            selectOption(selected);
          }
        } else if (allowCustom) {
          onChange(inputValue);
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const activeDescendant =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  return (
    <div
      ref={containerRef}
      className={styles.wrapper}
      data-testid="combobox"
    >
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          className={styles.dropdown}
          role="listbox"
        >
          {filtered.map((opt, index) => (
            <li
              key={opt.value}
              id={`${listId}-option-${index}`}
              className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""}`}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={() => selectOption(opt)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
