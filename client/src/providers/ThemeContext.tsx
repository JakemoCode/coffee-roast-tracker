import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (SSR, privacy mode)
  }
  return "light";
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  // Apply stored theme on initial render
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch {
        // localStorage unavailable
      }
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Falls back to light mode + no-op toggle when no provider is present.
// This lets isolated component tests render without wrapping in
// ThemeProvider — theming is a leaf concern, not a structural one.
// In real use AppProviders always wraps the tree.
const FALLBACK: ThemeContextValue = { theme: "light", toggleTheme: () => {} };

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK;
}
