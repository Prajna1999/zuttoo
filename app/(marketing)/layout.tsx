import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { MarketingThemeProvider } from "@/components/marketing/theme-provider";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={bricolage.variable}>
      <MarketingThemeProvider>
        <header className="sticky top-0 z-20 border-b border-mk-border bg-mk-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="font-display text-xl font-bold tracking-tight">
              zuttoo
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                href="/#products"
                className="hidden px-3 py-2 text-sm font-medium text-mk-ink-dim transition-colors hover:text-mk-ink sm:block"
              >
                Products
              </Link>
              <Link
                href="/contact"
                className="hidden px-3 py-2 text-sm font-medium text-mk-ink-dim transition-colors hover:text-mk-ink sm:block"
              >
                Contact
              </Link>
              <Link
                href="/assetiq"
                className="rounded-lg bg-mk-ink px-4 py-2 text-sm font-medium text-mk-bg shadow-sm transition-opacity hover:opacity-85"
              >
                Live demo
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-mk-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-10">
            <div>
              <div className="font-display text-base font-bold tracking-tight">zuttoo</div>
              <div className="mt-1 text-xs text-mk-ink-faint">AI products for real-world operations</div>
              <div className="mt-1 max-w-xs text-xs text-mk-ink-faint">
                3rd Floor, Orchid Centre, Sector 53, DLF QE, Gurgaon, Haryana 122002
              </div>
            </div>
            <div className="text-xs text-mk-ink-faint">
              © 2026 Zuttoo Technologies ·{" "}
              <Link href="/contact" className="transition-colors hover:text-mk-ink">
                Contact
              </Link>{" "}
            </div>
          </div>
        </footer>
      </MarketingThemeProvider>
    </div>
  );
}
