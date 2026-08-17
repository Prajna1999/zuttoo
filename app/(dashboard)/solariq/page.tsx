"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ComposedChart, BarChart, Bar, Cell, LabelList, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";
import REAL from "@/lib/solariq-real.json";

// Real SCADA data: Area Science Park PV plant Q2, Trieste (CC-BY-4.0), built by
// python/scripts/build-solariq-data.py from zenodo.org/records/7115550.

type Status = "healthy" | "warn" | "crit";
const STATUS_META: Record<Status, { color: string; label: string }> = {
  healthy: { color: COLORS.healthy, label: "NOMINAL" },
  warn: { color: COLORS.warn, label: "DEGRADED" },
  crit: { color: COLORS.crit, label: "CRITICAL" },
};

type Inverter = (typeof REAL.inverters)[number];

// conformance bands sized to this plant's real spread (96.9–99.3% full-period)
const confColor = (conf: number) =>
  conf < 96 ? COLORS.crit : conf < 98 ? COLORS.warn : COLORS.healthy;

export default function SolarIQDemo() {
  const [selId, setSelId] = useState(
    () => REAL.inverters.find((i) => i.status === "crit")?.id ?? REAL.inverters[0].id
  );
  const cur: Inverter = REAL.inverters.find((i) => i.id === selId)!;
  const meta = STATUS_META[cur.status];
  const k = REAL.kpis;

  const generation = useMemo(
    () =>
      REAL.generation.map((g) => ({
        ...g,
        hi: +(g.potential * 1.08).toFixed(2),
        lo: +(g.potential * 0.92).toFixed(2),
      })),
    []
  );

  return (
    <>
      <div className="mb-4 text-xs text-dim">
        {REAL.plant.name} · {REAL.plant.capacityKwp} kWp · {REAL.plant.inverters} inverters ·{" "}
        {REAL.plant.strings} strings · real SCADA data · {REAL.period.from} → {REAL.period.to}
      </div>

      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard
          label="PLANT PERFORMANCE"
          value={`${k.performancePct}%`}
          sub={`fleet string conformance · target ≥ ${k.targetPct}%`}
          color={k.performancePct < k.targetPct ? COLORS.warn : COLORS.healthy}
        />
        <KPICard
          label="DATA INTEGRITY"
          value={`${k.dataIntegrityPct}%`}
          sub="INV-02 voltage channel fault (2021)"
          color={k.dataIntegrityPct < 99 ? COLORS.warn : COLORS.healthy}
        />
        <KPICard
          label="ANOMALOUS ENERGY"
          value={`${k.anomalousMwh} MWh`}
          sub="string fault 1.7 + DAQ gap 3.2 · 2013–21"
          color={COLORS.warn}
        />
        <KPICard
          label="FAULT STRINGS"
          value={`${k.faultStrings} / ${k.totalStrings}`}
          sub="string 3 open-circuit (2017)"
          color={k.faultStrings ? COLORS.warn : COLORS.healthy}
        />
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,3fr)_minmax(250px,1fr)]">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">STRING CONFORMANCE — INVERTERS × STRINGS · click row for diagnosis</span>
            <span className="font-mono text-[10px] text-faint">
              <span style={{ color: COLORS.healthy }}>■</span>≥98{" "}
              <span style={{ color: COLORS.warn }}>■</span>96–98{" "}
              <span style={{ color: COLORS.crit }}>■</span>&lt;96
            </span>
          </div>
          <div className="overflow-x-auto">
            {REAL.grid.map((row, inv) => {
              const id = `INV-${String(inv + 1).padStart(2, "0")}`;
              const active = selId === id;
              return (
                <div
                  key={id}
                  onClick={() => setSelId(id)}
                  className="mb-0.5 flex cursor-pointer items-center gap-[3px] rounded px-1 py-0.5"
                  style={{ background: active ? COLORS.panelSoft : "transparent" }}
                >
                  <span className="w-[52px] flex-shrink-0 font-mono text-[10px]" style={{ color: active ? COLORS.text : COLORS.faint }}>
                    {id}
                  </span>
                  {row.map((conf, s) => (
                    <div
                      key={s}
                      title={`${id} S${s + 1}: ${conf}% conformance`}
                      className="h-[18px] w-[22px] flex-shrink-0 rounded-sm"
                      style={{ background: confColor(conf), opacity: conf >= 98 ? 0.55 : 0.95 }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">AI DIAGNOSIS — {cur.id}</span>
            <span className="font-mono text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
          </div>
          <div className="text-[13px] font-semibold" style={{ color: meta.color }}>{cur.title}</div>
          <div className="mt-2 text-xs leading-[1.55]">{cur.cause}</div>
          <div className="mt-2.5 rounded-lg bg-panel-soft px-3 py-2.5" style={{ borderLeft: `3px solid ${meta.color}` }}>
            <div className="mb-0.5 text-[10px] text-dim">Recommended action</div>
            <div className="text-xs">{cur.action}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">
            GENERATION vs POTENTIAL (kW) · {REAL.windowDate} · 24h — actual is missing the INV-02 voltage-channel output
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={generation} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={7} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} />
              <Line dataKey="potential" name="potential" stroke={COLORS.trace} strokeWidth={1.6} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="actual" name="actual" stroke={COLORS.healthy} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">LOSS ATTRIBUTION (MWh · 2013–21)</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={REAL.losses} layout="vertical" margin={{ top: 0, right: 34, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: COLORS.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="mwh" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {REAL.losses.map((l, i) => (
                  <Cell key={l.name} fill={i === 0 ? COLORS.warn : COLORS.trace} opacity={0.85} />
                ))}
                <LabelList dataKey="mwh" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionFooter text="Real SCADA data — Area Science Park PV plant Q2, Trieste, Italy (CC-BY-4.0) · SolarIQ integrates with your existing plant data systems through the protocol gateway" />
    </>
  );
}
