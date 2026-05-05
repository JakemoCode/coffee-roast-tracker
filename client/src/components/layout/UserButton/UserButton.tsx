import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./UserButton.module.css";

interface UserButtonProps {
  isAuthenticated: boolean;
  privateByDefault?: boolean;
  onTogglePrivacyDefault?: () => void;
  onSignOut?: () => void;
}

export function UserButton({
  isAuthenticated,
  privateByDefault = false,
  onTogglePrivacyDefault,
  onSignOut,
}: UserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isAuthenticated) {
    return (
      <Link
        to="/sign-in"
        className={styles.signInLink}
        data-testid="user-button"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.avatarButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account"
        type="button"
        data-testid="user-button"
      >
        U
      </button>

      {isOpen && (
        <div className={styles.dropdown} data-testid="user-dropdown" role="menu">
          <label className={styles.toggleLabel}>
            <span>Private by default</span>
            <input
              type="checkbox"
              checked={privateByDefault}
              onChange={onTogglePrivacyDefault}
              data-testid="privacy-default-toggle"
            />
          </label>

          <div className={styles.divider} />

          <button
            className={styles.dropdownItem}
            onClick={onSignOut}
            type="button"
            role="menuitem"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
