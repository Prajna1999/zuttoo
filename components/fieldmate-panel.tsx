"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "@/lib/design-system";
import { FM_THREADS, simulateFieldMateReply, type Attachment, type ProductId } from "@/lib/fieldmate-data";

type Message = { role: "user" | "assistant"; content: string; attachment?: Attachment };
type Threads = Partial<Record<ProductId, Message[]>>;

export function FieldMatePanel({
  open,
  onClose,
  productId,
}: {
  open: boolean;
  onClose: () => void;
  productId: ProductId;
}) {
  const cfg = FM_THREADS[productId];
  const [threads, setThreads] = useState<Threads>({});
  const messages = useMemo(
    () => threads[productId] ?? [{ role: "assistant" as const, content: cfg.greeting }],
    [threads, productId, cfg.greeting]
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setThreads((t) => ({ ...t, [productId]: [...messages, { role: "user", content: q }] }));
    setBusy(true);
    setDrafting(/draft|report|note/i.test(q));
    await new Promise((res) => setTimeout(res, 500 + Math.random() * 400));
    const { reply, attachment } = simulateFieldMateReply(productId, q);
    setThreads((t) => ({
      ...t,
      [productId]: [...(t[productId] ?? messages), { role: "assistant", content: reply, attachment }],
    }));
    setBusy(false);
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`z-40 flex flex-col overflow-hidden border-l border-line bg-panel ease-out
          max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:w-[min(380px,88vw)] max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-200
          ${open ? "max-lg:translate-x-0" : "max-lg:translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:transition-[width] lg:duration-200
          ${open ? "lg:w-[380px]" : "lg:w-0"}`}
        aria-hidden={!open}
      >
        <div className="flex h-screen w-[min(380px,88vw)] flex-col lg:w-[380px]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔧</span>
            <div>
              <div className="text-[13px] font-semibold">FieldMate</div>
              <div className="text-[10px] text-faint">{cfg.site}</div>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer border-none bg-transparent text-lg text-dim">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[88%] whitespace-pre-wrap rounded-[10px] px-3 py-2.5 text-[13px] leading-[1.55]"
                style={{
                  background: m.role === "user" ? COLORS.trace + "22" : COLORS.panelSoft,
                  border: `1px solid ${m.role === "user" ? COLORS.trace + "55" : COLORS.line}`,
                }}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 font-mono text-[9px]" style={{ color: COLORS.healthy }}>
                    FIELDMATE
                  </div>
                )}
                {m.content}
                {m.attachment && (
                  <div
                    className="mt-2.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                    style={{ background: COLORS.bg, border: `1px solid ${COLORS.line}` }}
                  >
                    <span className="text-xl">📄</span>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[11px] text-text">{m.attachment.name}</div>
                      <div className="text-[10px] text-faint">
                        PDF · {m.attachment.pages} page{m.attachment.pages > 1 ? "s" : ""} · simulated attachment
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="font-mono text-[11px] text-dim">
              <span style={{ color: COLORS.healthy }}>●</span> {drafting ? "drafting…" : "analysing…"}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {cfg.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-line bg-panel-soft px-2.5 py-1.5 text-[11px] text-dim disabled:cursor-default"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask FieldMate…"
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-2.5 text-[13px] text-text outline-none"
          />
          <button
            onClick={() => send()}
            disabled={busy}
            className="rounded-lg px-[18px] font-mono text-xs font-bold disabled:cursor-default"
            style={{ background: busy ? COLORS.line : COLORS.healthy, color: COLORS.bg }}
          >
            SEND
          </button>
        </div>
        </div>
      </aside>
    </>
  );
}
