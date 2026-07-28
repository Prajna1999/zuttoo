"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ReferenceLine, ComposedChart, BarChart, Bar, Cell, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";

const FEEDERS = [
  { id: "F-03", name: "Industrial Estate", input: 412, billed: 388, meters: 1240 },
  { id: "F-07", name: "Old City North", input: 356, billed: 264, meters: 8420 },
  { id: "F-11", name: "Ring Road Commercial", input: 298, billed: 271, meters: 3105 },
  { id: "F-14", name: "Sector 9 Residential", input: 189, billed: 176, meters: 6230 },
  { id: "F-19", name: "Agri Pumpset Zone", input: 244, billed: 168, meters: 2890 },
];
const SUSPECTS: Record<string, { id: string; type: string; score: number; pattern: string; loss: string }[]> = {
  "F-07": [
    { id: "C-88412", type: "Commercial", score: 0.94, pattern: "Consumption dropped 71% after meter swap; neighbours' load unchanged. Nighttime usage inconsistent with connected load.", loss: "~2,400 kWh/mo" },
    { id: "C-81067", type: "Residential", score: 0.89, pattern: "Zero recorded consumption for 4 months while DTR loading at premises node rose 8%.", loss: "~950 kWh/mo" },
    { id: "C-83550", type: "Commercial", score: 0.85, pattern: "Sustained draw exactly at sanctioned-load ceiling; harmonic signature suggests bypassed CT.", loss: "~3,100 kWh/mo" },
  ],
  "F-19": [
    { id: "C-52201", type: "Agricultural", score: 0.91, pattern: "Pump signature detected on feeder during unmetered hours; consumer meter shows no draw.", loss: "~1,800 kWh/mo" },
    { id: "C-52987", type: "Agricultural", score: 0.82, pattern: "Consumption 88% below similar-pumpset cohort median for 3 consecutive seasons.", loss: "~1,200 kWh/mo" },
  ],
  "F-03": [{ id: "C-10442", type: "Industrial", score: 0.71, pattern: "TOD-band consumption shifted abnormally after tariff revision; possible time-sync tamper.", loss: "~1,500 kWh/mo" }],
  "F-11": [{ id: "C-33019", type: "Commercial", score: 0.68, pattern: "Meter reads plateau during high-footfall festival week vs. cohort surge.", loss: "~700 kWh/mo" }],
  "F-14": [],
};

function genLoadForecast() {
  return Array.from({ length: 24 }, (_, h) => {
    const base = 14 + Math.sin(((h - 7) / 24) * Math.PI * 2) * 4 + (h > 17 && h < 22 ? 5.5 : 0);
    const pred = +(base + Math.sin(h * 1.7) * 0.35).toFixed(2);
    return { h: `${String(h).padStart(2, "0")}:00`, pred, lo: +(pred * 0.94).toFixed(2), hi: +(pred * 1.06).toFixed(2), actual: h <= 14 ? +(base + Math.sin(h * 2.3) * 0.6).toFixed(2) : null };
  });
}

export default function GridSenseDemo() {
  const [feeder, setFeeder] = useState("F-07");
  const forecast = useMemo(() => genLoadForecast(), []);
  const feeders = FEEDERS.map((f) => ({ ...f, lossPct: +(((f.input - f.billed) / f.input) * 100).toFixed(1) }));
  const sel = feeders.find((f) => f.id === feeder)!;
  const suspects = SUSPECTS[feeder] || [];
  const totI = feeders.reduce((s, f) => s + f.input, 0);
  const totB = feeders.reduce((s, f) => s + f.billed, 0);
  const lossColor = (p: number) => (p > 20 ? COLORS.crit : p > 10 ? COLORS.warn : COLORS.healthy);

  return (
    <>
      <div className="mb-4 text-xs text-dim">AMI intelligence · Division 4 · 5 feeders · 21,885 smart meters</div>
      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard label="AT&C LOSS (DIVISION)" value={`${(((totI - totB) / totI) * 100).toFixed(1)}%`} sub="vs 21.4% pre-AMI baseline" color={COLORS.warn} />
        <KPICard label="METERS ONLINE" value="21,885" sub="98.7% comms availability" color={COLORS.healthy} />
        <KPICard label="THEFT SUSPECTS FLAGGED" value={String(Object.values(SUSPECTS).flat().length)} sub="est. recovery ₹4.1L /mo" color={COLORS.crit} />
        <KPICard label="FORECAST MAPE" value="2.8%" sub="last 30 days" color={COLORS.trace} />
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">FEEDER ENERGY ACCOUNTING — INPUT vs BILLED (MWh, 30d)</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={feeders} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="id" tick={{ fill: COLORS.dim, fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="input" name="Input" fill={COLORS.trace} opacity={0.45} radius={[3, 3, 0, 0]} />
              <Bar dataKey="billed" name="Billed" radius={[3, 3, 0, 0]}>
                {feeders.map((f) => (
                  <Cell key={f.id} fill={lossColor(f.lossPct)} opacity={f.id === feeder ? 1 : 0.55} cursor="pointer" onClick={() => setFeeder(f.id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {feeders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFeeder(f.id)}
                className="cursor-pointer rounded px-2 py-1 font-mono text-[10px]"
                style={{ border: `1px solid ${f.id === feeder ? lossColor(f.lossPct) : COLORS.line}`, color: f.id === feeder ? lossColor(f.lossPct) : COLORS.dim }}
              >
                {f.id} · {f.lossPct}%
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">LOAD FORECAST — ACTUAL vs DAY-AHEAD (MW)</div>
          <ResponsiveContainer width="100%" height={248}>
            <ComposedChart data={forecast} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="h" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={3} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} domain={[8, 26]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} name="+band" />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} name="-band" />
              <Line dataKey="pred" stroke={COLORS.trace} strokeWidth={1.6} strokeDasharray="5 4" dot={false} name="forecast" isAnimationActive={false} />
              <Line dataKey="actual" stroke={COLORS.healthy} strokeWidth={2} dot={false} name="actual" isAnimationActive={false} />
              <ReferenceLine x="15:00" stroke={COLORS.faint} strokeDasharray="2 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[10px] border border-line bg-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-1.5">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-dim">
            THEFT SUSPECTS · {sel.id} {sel.name.toUpperCase()}
          </div>
          <span className="font-mono text-[11px]" style={{ color: lossColor(sel.lossPct) }}>
            feeder loss {sel.lossPct}% · {sel.meters.toLocaleString()} meters
          </span>
        </div>
        {suspects.length === 0 && <div className="mt-3 text-xs text-faint">No high-confidence suspects. Loss within technical expectation.</div>}
        {suspects.map((s) => (
          <div key={s.id} className="mt-3 flex items-start gap-3.5 border-t border-line pt-3">
            <div className="w-[110px] flex-shrink-0">
              <div className="font-mono text-[13px] font-semibold">{s.id}</div>
              <div className="text-[10px] text-dim">{s.type}</div>
              <div className="mt-0.5 font-mono text-[11px]" style={{ color: s.score > 0.85 ? COLORS.crit : COLORS.warn }}>score {s.score}</div>
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] leading-[1.5]">{s.pattern}</div>
              <div className="mt-0.5 text-[11px] text-dim">
                est. unbilled: <span className="font-mono text-text">{s.loss}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <SectionFooter text="Simulated data · GridSense runs on existing AMI head-end data — no meter changes required" />
    </>
  );
}
