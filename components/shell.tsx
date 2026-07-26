"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS, PRODUCTS } from "@/lib/design-system";
import { FieldMatePanel } from "@/components/fieldmate-panel";

export function Shell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("fieldmate-seen")) return;
    localStorage.setItem("fieldmate-seen", "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of external storage on mount
    setCopilotOpen(true);
  }, []);
  const pathname = usePathname();
  const activeId = pathname.split("/")[1] || "assetiq";
  const product = PRODUCTS.find((p) => p.id === activeId) ?? PRODUCTS[0];

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <nav
        className="flex flex-shrink-0 flex-col overflow-hidden border-r border-line bg-nav-bg transition-[width] duration-200 ease-out"
        style={{ width: navOpen ? 220 : 54 }}
      >
        <div
          className={`flex items-center justify-between ${navOpen ? "px-3.5 pt-4 pb-3" : "px-2.5 pt-4 pb-3"}`}
        >
          {navOpen && (
            <span className="whitespace-nowrap font-mono text-[13px] font-bold tracking-[0.04em]">
              ZUTTOO
            </span>
          )}
          <button
            onClick={() => setNavOpen((v) => !v)}
            className="cursor-pointer border-none bg-transparent p-1 text-base text-dim"
          >
            {navOpen ? "◁" : "▷"}
          </button>
        </div>
        <div className="flex-1 px-1.5 py-1">
          {PRODUCTS.map((p) => {
            const active = p.id === activeId;
            return (
              <Link
                key={p.id}
                href={`/${p.id}`}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left ${
                  active ? "bg-panel-soft text-text" : "text-dim"
                }`}
              >
                <span className="flex-shrink-0 text-lg">{p.icon}</span>
                {navOpen && (
                  <div>
                    <div className="whitespace-nowrap text-[12.5px] font-semibold">
                      {p.name}
                    </div>
                    <div className="whitespace-nowrap text-[10px] text-faint">
                      {p.sub}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
        {navOpen && (
          <div className="border-t border-line px-3.5 py-3 text-[10px] leading-relaxed text-faint">
            Demo suite · simulated data
            <br />
            Zuttoo Technologies
          </div>
        )}
      </nav>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[22px] pt-4 pb-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-[19px] font-bold">{product.name}</span>
            <span
              className="rounded font-mono text-[10px] font-semibold"
              style={{ color: COLORS.bg, background: COLORS.healthy, padding: "2px 7px" }}
            >
              DEMO
            </span>
          </div>
          <button
            onClick={() => setCopilotOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px]"
            style={{ borderColor: COLORS.line, color: COLORS.dim }}
          >
            <span>🔧</span> Ask FieldMate
          </button>
        </div>
        <div className="px-[22px] pt-4 pb-6">{children}</div>
      </main>

      <FieldMatePanel open={copilotOpen} onClose={() => setCopilotOpen(false)} productId={product.id} />
    </div>
  );
}
