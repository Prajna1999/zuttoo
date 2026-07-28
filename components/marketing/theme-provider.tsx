// Marketing pages are light-only. The [data-mk-theme="dark"] token overrides
// remain in globals.css if a toggle ever comes back.
export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div data-mk-theme="light" className="min-h-screen bg-mk-bg text-mk-ink">
      {children}
    </div>
  );
}
