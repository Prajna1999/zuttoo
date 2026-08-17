"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ComposedChart, BarChart, Bar, Cell, LabelList, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";
import REAL from "@/lib/gridsense-real.json";

// Real AMI data: ECL smart-meter network (UCI ElectricityLoadDiagrams20112014), built by
// python/scripts/build-gridsense-data.py.

type Suspect = (typeof REAL.suspects)[number];

const lossColor = (p: number) => (p > 15 ? COLORS.crit : p > 5 ? COLORS.warn : COLORS.healthy);

export default function GridSenseDemo() {
  const defaultFeeder =
    REAL.suspects.reduce((a, b) => (b.score > a.score ? b : a), REAL.suspects[0])?.feeder ??
    REAL.feeders[0].id;
  const [feeder, setFeeder] = useState(defaultFeeder);
  const sel = REAL.feeders.find((f) => f.id === feeder)!;
  const suspects = REAL.suspects.filter((s) => s.feeder === feeder);
  const k = REAL.kpis;

  const forecast = useMemo(
    () =>
      REAL.forecast.map((p) => ({
        ...p,
        hi: +(p.pred * 1.06).toFixed(1),
        lo: +(p.pred * 0.94).toFixed(1),
      })),
    []
  );

  const suspectColor = (s: Suspect) => (s.score > 0.45 ? COLORS.crit : COLORS.warn);

  return (
    <>
      <div className="mb-4 text-xs text-dim">
        AMI intelligence · {REAL.plant.name} · {REAL.plant.meters} smart meters · hourly ·{" "}
        {REAL.plant.location} · {REAL.period.from} → {REAL.period.to}
      </div>

      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard
          label="UNEXPLAINED ENERGY (30D)"
          value={`${k.unexplainedPct}%`}
          sub="expected vs recorded · heavy-industry seasonal shift dominates"
          color={COLORS.warn}
        />
        <KPICard
          label="METERS HEALTHY"
          value={`${k.metersHealthy} / ${k.totalMeters}`}
          sub={`${k.totalMeters - k.metersHealthy} stuck meters (dead/bypassed)`}
          color={k.metersHealthy / k.totalMeters < 0.98 ? COLORS.warn : COLORS.healthy}
        />
        <KPICard
          label="SUSPECTS FLAGGED"
          value={`${k.suspects}`}
          sub={`est. unbilled ≈ ${k.recoveryKwhMo.toLocaleString()} kWh/mo`}
          color={k.suspects ? COLORS.crit : COLORS.healthy}
        />
        <KPICard
          label="DAY-AHEAD MAPE"
          value={`${k.mapPct}%`}
          sub={`of ${REAL.plant.peakMw.toLocaleString()} MW peak · GBDT day-ahead`}
          color={COLORS.trace}
        />
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">UNEXPLAINED ENERGY BY FEEDER (MWh · 30d) — click to inspect suspects</span>
            <span className="font-mono text-[10px] text-faint">expected vs recorded · Dec 2014</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={REAL.feeders} layout="vertical" margin={{ top: 0, right: 34, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="id" width={40} tick={{ fill: COLORS.dim, fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="gapMwh" name="unexplained MWh" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {REAL.feeders.map((f) => (
                  <Cell
                    key={f.id}
                    fill={lossColor(f.lossPct)}
                    opacity={f.id === feeder ? 1 : 0.45}
                    cursor="pointer"
                    onClick={() => setFeeder(f.id)}
                  />
                ))}
                <LabelList dataKey="gapMwh" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {REAL.feeders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFeeder(f.id)}
                className="cursor-pointer rounded px-2 py-1 font-mono text-[10px]"
                style={{
                  border: `1px solid ${f.id === feeder ? lossColor(f.lossPct) : COLORS.line}`,
                  color: f.id === feeder ? lossColor(f.lossPct) : COLORS.dim,
                }}
              >
                {f.id} · {f.lossPct}%
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">
            DAY-AHEAD LOAD FORECAST (MW) · {REAL.forecastDate} · GBDT, MAPE {k.mapPct}% of peak
          </div>
          <ResponsiveContainer width="100%" height={248}>
            <ComposedChart data={forecast} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={3} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} name="+band" />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} name="-band" />
              <Line dataKey="pred" name="day-ahead" stroke={COLORS.trace} strokeWidth={1.6} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="actual" name="actual" stroke={COLORS.healthy} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[10px] border border-line bg-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-1.5">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-dim">
            SUSPECTS · {sel.id} {sel.name.toUpperCase()}
          </div>
          <span className="font-mono text-[11px]" style={{ color: lossColor(sel.lossPct) }}>
            {sel.lossPct}% unexplained · {sel.meters} meters · {sel.expectedMwh.toLocaleString()} vs {sel.recordedMwh.toLocaleString()} MWh
          </span>
        </div>
        {suspects.length === 0 && (
          <div className="mt-3 text-xs text-faint">
            No high-confidence suspects. {sel.lossPct > 10 ? "The unexplained energy here is seasonal/operational change in large meters, not a per-meter anomaly." : "Loss within expectation."}
          </div>
        )}
        {suspects.map((s) => (
          <div key={s.id} className="mt-3 flex items-start gap-3.5 border-t border-line pt-3">
            <div className="w-[110px] flex-shrink-0">
              <div className="font-mono text-[13px] font-semibold">{s.id}</div>
              <div className="text-[10px] text-dim">{s.type}</div>
              <div className="mt-0.5 font-mono text-[11px]" style={{ color: suspectColor(s) }}>score {s.score}</div>
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

      <SectionFooter text="Real AMI data — ECL smart-meter network, UCI ElectricityLoadDiagrams20112014 (Portuguese distribution utility) · GridSense runs on existing AMI head-end data — no meter changes required" />
    </>
  );
}
