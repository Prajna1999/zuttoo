"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useMkTheme() {
  return useContext(ThemeContext);
}

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("mk-theme");
    if (stored === "dark" || stored === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of external storage on mount
      setTheme(stored);
    }
  }, []);

  function toggle() {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("mk-theme", next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-mk-theme={theme} className="min-h-screen bg-mk-bg text-mk-ink">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
