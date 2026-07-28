"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ReferenceLine, ComposedChart, BarChart, Bar, Cell, LabelList, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE, mulberry32 } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";

const INV_COUNT = 10, STR_COUNT = 18;
const SOLAR_DIAGNOSES: Record<number, { title: string; cause: string; action: string; sev: string }> = {
  3: { title: "INV-04 · strings 7–10 (PR ~64%)", cause: "Symmetric drop across 4 adjacent strings, 11-day onset, no irradiance correlation. Matches string-fuse failure cluster.", action: "Check combiner box CB-04-B fuses. Est. recovery +38 MWh/yr.", sev: COLORS.crit },
  6: { title: "INV-07 · uniform deficit (−5.5%)", cause: "Whole-inverter uniform loss with 9-day drift and dust-storm correlation: soiling.", action: "Advance wash cycle for Block 7 by 6 days. Wash ROI positive at current loss rate.", sev: COLORS.warn },
  8: { title: "INV-09 · string 15 dead", cause: "Zero current since 03:40 Tue; adjacent strings normal. Likely DC connector or fuse open-circuit.", action: "Dispatch with IV-curve tracer. Est. loss ₹410/day.", sev: COLORS.crit },
  1: { title: "INV-02 · strings 16–18 evening loss", cause: "Loss 15:30–18:00 only; matches shadow profile of new water tank south-west of Block 2.", action: "Confirm shading source; evaluate string re-layout.", sev: COLORS.warn },
};
const LOSSES_DATA = [
  { name: "Soiling", mwh: 42 }, { name: "String faults", mwh: 31 }, { name: "Inverter derate", mwh: 18 },
  { name: "Shading", mwh: 12 }, { name: "Clipping", mwh: 9 }, { name: "Degradation", mwh: 22 },
];

function buildSolarGrid() {
  const rnd = mulberry32(7);
  return Array.from({ length: INV_COUNT }, (_, inv) =>
    Array.from({ length: STR_COUNT }, (_, s) => {
      let pr = 96 + (rnd() - 0.5) * 3;
      if (inv === 3 && s >= 6 && s <= 9) pr = 62 + rnd() * 6;
      if (inv === 6) pr -= 5.5;
      if (inv === 8 && s === 14) pr = 0;
      if (inv === 1 && s >= 15) pr -= 3.2;
      return Math.max(0, +pr.toFixed(1));
    })
  );
}

function genSolarForecast() {
  return Array.from({ length: 60 }, (_, i) => {
    const h = 5 + i / 4, bell = Math.max(0, Math.sin(((h - 5.5) / 13.5) * Math.PI));
    const sched = +(48 * bell).toFixed(1), cloud = h > 11 && h < 13 ? 0.78 : 1;
    return { t: `${String(Math.floor(h)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`, sched, hi: +(sched * 1.1).toFixed(1), lo: +(sched * 0.9).toFixed(1), actual: h <= 15 ? +Math.max(0, 48 * bell * cloud + Math.sin(h * 9) * 0.8).toFixed(1) : null };
  });
}

export default function SolarIQDemo() {
  const grid = useMemo(() => buildSolarGrid(), []);
  const forecast = useMemo(() => genSolarForecast(), []);
  const [selInv, setSelInv] = useState(3);
  const flat = grid.flat().filter((v) => v > 0);
  const plantPR = (flat.reduce((a, b) => a + b, 0) / flat.length).toFixed(1);
  const diag = SOLAR_DIAGNOSES[selInv];
  const prColor = (pr: number) => (pr === 0 ? "#3A3F46" : pr < 75 ? COLORS.crit : pr < 90 ? COLORS.warn : COLORS.healthy);

  return (
    <>
      <div className="mb-4 text-xs text-dim">Pooling Station 3 · 5 MWp · 10 inverters · 180 strings</div>
      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard label="PLANT PR (TODAY)" value={`${plantPR}%`} sub="target ≥ 95%" color={+plantPR < 93 ? COLORS.warn : COLORS.healthy} />
        <KPICard label="GEN vs SCHEDULE" value="−1.9%" sub="within ±10% DSM band" color={COLORS.healthy} />
        <KPICard label="RECOVERABLE LOSS" value="103 MWh/yr" sub="≈ ₹4.6L at PPA rate" color={COLORS.warn} />
        <KPICard label="FAULT STRINGS" value="6 / 180" sub="2 clusters + 1 dead" color={COLORS.crit} />
      </div>

      <div className="mb-3.5 grid grid-cols-[minmax(0,3fr)_minmax(250px,1fr)] gap-3.5">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">STRING PR — INVERTERS × STRINGS · click row for diagnosis</span>
            <span className="font-mono text-[10px] text-faint">
              <span style={{ color: COLORS.healthy }}>■</span>≥90{" "}
              <span style={{ color: COLORS.warn }}>■</span>75–90{" "}
              <span style={{ color: COLORS.crit }}>■</span>&lt;75
            </span>
          </div>
          <div className="overflow-x-auto">
            {grid.map((row, inv) => (
              <div
                key={inv}
                onClick={() => setSelInv(inv)}
                className="mb-0.5 flex cursor-pointer items-center gap-[3px] rounded px-1 py-0.5"
                style={{ background: selInv === inv ? COLORS.panelSoft : "transparent" }}
              >
                <span className="w-[52px] flex-shrink-0 font-mono text-[10px]" style={{ color: selInv === inv ? COLORS.text : COLORS.faint }}>
                  INV-{String(inv + 1).padStart(2, "0")}
                </span>
                {row.map((pr, s) => (
                  <div
                    key={s}
                    title={`INV-${inv + 1} S${s + 1}: ${pr}%`}
                    className="h-[18px] w-[22px] flex-shrink-0 rounded-sm"
                    style={{ background: prColor(pr), opacity: pr >= 90 ? 0.55 : 0.95 }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">AI DIAGNOSIS</div>
          {diag ? (
            <>
              <div className="text-[13px] font-semibold" style={{ color: diag.sev }}>{diag.title}</div>
              <div className="mt-2 text-xs leading-[1.55]">{diag.cause}</div>
              <div className="mt-2.5 rounded-lg bg-panel-soft px-3 py-2.5" style={{ borderLeft: `3px solid ${diag.sev}` }}>
                <div className="mb-0.5 text-[10px] text-dim">Recommended action</div>
                <div className="text-xs">{diag.action}</div>
              </div>
            </>
          ) : (
            <div className="text-xs leading-[1.6] text-faint">
              INV-{String(selInv + 1).padStart(2, "0")} performing within band. Select INV-02, 04, 07 or 09.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3.5">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">GENERATION vs SCHEDULE (MW) · DSM ±10% BAND</div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={forecast} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={11} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} />
              <Line dataKey="sched" stroke={COLORS.trace} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="actual" stroke={COLORS.healthy} strokeWidth={2} dot={false} isAnimationActive={false} />
              <ReferenceLine x="15:00" stroke={COLORS.faint} strokeDasharray="2 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">LOSS ATTRIBUTION (MWh/yr)</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={LOSSES_DATA} layout="vertical" margin={{ top: 0, right: 34, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: COLORS.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="mwh" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {LOSSES_DATA.map((l) => (
                  <Cell key={l.name} fill={["Soiling", "String faults"].includes(l.name) ? COLORS.warn : COLORS.trace} opacity={0.85} />
                ))}
                <LabelList dataKey="mwh" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <SectionFooter text="Simulated data · SolarIQ integrates with your existing plant data systems through the protocol gateway" />
    </>
  );
}
