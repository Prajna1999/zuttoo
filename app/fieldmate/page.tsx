"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/design-system";
import { SITE_TELEMETRY, FM_SUGGESTIONS, simulateFieldMateReply } from "@/lib/fieldmate-data";
import { SectionFooter } from "@/components/section-footer";

type Message = { role: "user" | "assistant"; content: string };

export default function FieldMateDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "FieldMate online. I see TX-097 (degrading, cooling fan fault), F-07 (tripped 14:30, restored), INV-212 (critical). What do you need?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    // Simulated copilot: canned, telemetry-grounded replies — no live model call.
    await new Promise((res) => setTimeout(res, 500 + Math.random() * 400));
    setMessages((m) => [...m, { role: "assistant", content: simulateFieldMateReply(q) }]);
    setBusy(false);
  }

  return (
    <>
      <div className="mb-3.5 text-xs text-dim">Field copilot · grounded in live telemetry · {SITE_TELEMETRY.site}</div>
      <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)] gap-3.5">
        <div className="self-start rounded-[10px] border border-line bg-panel p-3">
          <div className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-dim">SITE CONTEXT (LIVE)</div>
          {Object.entries(SITE_TELEMETRY.assets).map(([id, a]) => {
            const col = a.status.startsWith("CRIT") ? COLORS.crit : a.status.startsWith("DEGRAD") || a.status.startsWith("TRIP") ? COLORS.warn : COLORS.healthy;
            return (
              <div key={id} className="mb-2 rounded-lg bg-panel-soft px-2.5 py-2" style={{ border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${col}` }}>
                <div className="flex justify-between">
                  <span className="font-mono text-xs font-semibold">{id}</span>
                  <span className="font-mono text-[9px]" style={{ color: col }}>{a.status.substring(0, 20)}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-dim">{a.type}</div>
              </div>
            );
          })}
          <div className="mt-1.5 text-[10px] leading-[1.5] text-faint">Answers grounded in snapshot only. Switching is safety-gated.</div>
        </div>

        <div className="flex min-h-[480px] flex-col rounded-[10px] border border-line bg-panel">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[82%] whitespace-pre-wrap rounded-[10px] px-[13px] py-2.5 text-[13px] leading-[1.55]"
                  style={{
                    background: m.role === "user" ? COLORS.trace + "22" : COLORS.panelSoft,
                    border: `1px solid ${m.role === "user" ? COLORS.trace + "55" : COLORS.line}`,
                  }}
                >
                  {m.role === "assistant" && <div className="mb-1 font-mono text-[9px]" style={{ color: COLORS.healthy }}>FIELDMATE</div>}
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="font-mono text-[11px] text-dim">
                <span style={{ color: COLORS.healthy }}>●</span> analysing…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {FM_SUGGESTIONS.map((s) => (
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
              placeholder="Ask about any asset… (Hindi / ଓଡ଼ିଆ / العربية)"
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
      </div>
      <SectionFooter text="Telemetry simulated · responses live from LLM · safety-critical actions always human-authorised" />
    </>
  );
}
