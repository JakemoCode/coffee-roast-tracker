import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { TempToggle } from "../TempToggle";
import { ThemeToggle } from "../ThemeToggle";
import { UserButton } from "../UserButton";
import styles from "./Header.module.css";

interface HeaderProps {
  isAuthenticated: boolean;
  tempUnit: "CELSIUS" | "FAHRENHEIT";
  onToggleTempUnit: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  privateByDefault: boolean;
  onTogglePrivacyDefault: () => void;
  onSignOut: () => void;
  onUploadOpen: () => void;
}

export function Header({
  isAuthenticated,
  tempUnit,
  onToggleTempUnit,
  theme,
  onToggleTheme,
  privateByDefault,
  onTogglePrivacyDefault,
  onSignOut,
  onUploadOpen,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header} data-testid="header">
      <Link to="/" className={styles.logo}>
        Coffee Roast Tracker
      </Link>

      <nav className={styles.nav}>
        {isAuthenticated && (
          <>
            <NavLink
              to="/beans"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              Beans
            </NavLink>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              My Roasts
            </NavLink>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={onUploadOpen}
            >
              Upload
            </button>
          </>
        )}
      </nav>

      <div className={styles.rightSection}>
        <div className={styles.rightItems}>
          <TempToggle unit={tempUnit} onToggle={onToggleTempUnit} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <UserButton
            isAuthenticated={isAuthenticated}
            privateByDefault={privateByDefault}
            onTogglePrivacyDefault={onTogglePrivacyDefault}
            onSignOut={onSignOut}
          />
        </div>

        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          data-testid="hamburger-menu"
        >
          &#9776;
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu} data-testid="mobile-menu">
          <TempToggle unit={tempUnit} onToggle={onToggleTempUnit} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <UserButton
            isAuthenticated={isAuthenticated}
            privateByDefault={privateByDefault}
            onTogglePrivacyDefault={onTogglePrivacyDefault}
            onSignOut={onSignOut}
          />
        </div>
      )}
    </header>
  );
}
