"use client";

import { useMkTheme } from "@/components/marketing/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useMkTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-mk-border text-mk-ink-dim transition-colors hover:bg-mk-surface hover:text-mk-ink"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        </svg>
      )}
    </button>
  );
}
