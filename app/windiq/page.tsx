"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ReferenceLine, ComposedChart, BarChart, Bar, Cell, LabelList, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE, mulberry32 } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";

type Status = "low" | "warn" | "crit";
const STATUS_META: Record<Status, { color: string; label: string }> = {
  low: { color: COLORS.healthy, label: "NOMINAL" },
  warn: { color: COLORS.warn, label: "DEGRADED" },
  crit: { color: COLORS.crit, label: "CRITICAL" },
};

const TURBINES: {
  id: string; capacity: number; conformance: number; status: Status;
  issue: string; action: string;
}[] = [
  { id: "WTG-01", capacity: 3.0, conformance: 97, status: "low", issue: "Power curve tracking IEC reference within tolerance.", action: "No action needed." },
  { id: "WTG-02", capacity: 3.0, conformance: 95, status: "low", issue: "Power curve tracking IEC reference within tolerance.", action: "No action needed." },
  { id: "WTG-03", capacity: 3.0, conformance: 58, status: "crit", issue: "Yaw misalignment averaging 6.4° over 72h — power curve trailing reference by 9% at rated wind speed.", action: "Dispatch yaw calibration. Est. recovery ~140 MWh/yr." },
  { id: "WTG-04", capacity: 3.0, conformance: 91, status: "low", issue: "Power curve tracking IEC reference within tolerance.", action: "No action needed." },
  { id: "WTG-05", capacity: 3.0, conformance: 76, status: "warn", issue: "8% deficit at 6–10 m/s band, no fault codes — wake shadow from WTG-03 during prevailing SW wind.", action: "Model wake steering offset for WTG-03 during SW regime." },
  { id: "WTG-06", capacity: 3.0, conformance: 94, status: "low", issue: "Power curve tracking IEC reference within tolerance.", action: "No action needed." },
  { id: "WTG-07", capacity: 3.0, conformance: 41, status: "crit", issue: "Gearbox bearing vibration RMS up 3.1x baseline over 9 days, correlated with oil temp drift.", action: "Ground turbine, borescope inspection within 48h." },
  { id: "WTG-08", capacity: 3.0, conformance: 89, status: "low", issue: "Power curve tracking IEC reference within tolerance.", action: "No action needed." },
];

const LOSSES_DATA = [
  { name: "Wake effect", mwh: 38 }, { name: "Yaw error", mwh: 27 }, { name: "Gearbox derate", mwh: 21 },
  { name: "Curtailment", mwh: 33 }, { name: "Icing", mwh: 9 }, { name: "Grid outage", mwh: 6 },
];

function genGenerationForecast() {
  const rnd = mulberry32(23);
  return Array.from({ length: 48 }, (_, i) => {
    const h = i / 2;
    const windSpeed = 7 + Math.sin((h / 24) * Math.PI * 2 - 1) * 3.2 + (rnd() - 0.5) * 0.8;
    const curve = Math.min(1, Math.max(0, (windSpeed - 3.5) / 8.5));
    const pred = +(42 * Math.pow(curve, 1.6)).toFixed(1);
    return {
      t: `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 === 0 ? "00" : "30"}`,
      pred, hi: +(pred * 1.08).toFixed(1), lo: +(pred * 0.92).toFixed(1),
      actual: h <= 30 ? +Math.max(0, pred * (0.9 + rnd() * 0.15)).toFixed(1) : null,
    };
  });
}

export default function WindIQDemo() {
  const forecast = useMemo(() => genGenerationForecast(), []);
  const [selId, setSelId] = useState("WTG-07");
  const sel = TURBINES.find((t) => t.id === selId)!;
  const meta = STATUS_META[sel.status];
  const avgConformance = (TURBINES.reduce((s, t) => s + t.conformance, 0) / TURBINES.length).toFixed(1);
  const flagged = TURBINES.filter((t) => t.status !== "low").length;

  return (
    <>
      <div className="mb-4 text-xs text-dim">Wind Farm 2 · 42 MW · 14 turbines (8 monitored)</div>
      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard label="FLEET AVAILABILITY" value="96.2%" sub="rolling 30 days" color={COLORS.healthy} />
        <KPICard label="POWER CURVE CONFORMANCE" value={`${avgConformance}%`} sub="vs IEC reference curve" color={+avgConformance < 85 ? COLORS.warn : COLORS.healthy} />
        <KPICard label="RECOVERABLE LOSS" value="134 MWh/yr" sub="≈ ₹6.0L at PPA rate" color={COLORS.warn} />
        <KPICard label="TURBINES FLAGGED" value={`${flagged} / 8`} sub="1 critical, 1 warning" color={COLORS.crit} />
      </div>

      <div className="mb-3.5 rounded-[10px] border border-line bg-panel px-[18px] py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold tracking-[0.08em] text-dim">TURBINE FLEET — POWER CURVE CONFORMANCE</span>
          <span className="font-mono text-[11px] text-faint">click to diagnose</span>
        </div>
        {TURBINES.map((t) => {
          const m = STATUS_META[t.status];
          const active = t.id === selId;
          return (
            <div
              key={t.id}
              onClick={() => setSelId(t.id)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-[7px]"
              style={{ background: active ? COLORS.panelSoft : "transparent" }}
            >
              <span className="w-16 font-mono text-xs">{t.id}</span>
              <span className="w-11 flex-shrink-0 text-[10px] text-faint">{t.capacity.toFixed(1)} MW</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${t.conformance}%`, background: `linear-gradient(90deg, ${m.color}44, ${m.color})` }}
                />
              </div>
              <span className="w-16 text-right font-mono text-xs" style={{ color: m.color }}>{t.conformance}%</span>
              <span className="w-[78px] flex-shrink-0 text-right font-mono text-[10px] tracking-[0.04em]" style={{ color: m.color }}>{m.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mb-3.5 rounded-[10px] border border-line bg-panel p-4">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">AI DIAGNOSIS — {selId}</span>
          <span className="font-mono text-[11px]" style={{ color: meta.color }}>{meta.label} · {sel.conformance}% conformance</span>
        </div>
        <div className="text-xs leading-[1.55]">{sel.issue}</div>
        <div className="mt-2.5 rounded-lg bg-panel-soft px-3 py-2.5" style={{ borderLeft: `3px solid ${meta.color}` }}>
          <div className="mb-0.5 text-[10px] text-dim">Recommended action</div>
          <div className="text-xs">{sel.action}</div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3.5">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">GENERATION vs FORECAST (MW) · 48h</div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={forecast} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={7} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} />
              <Line dataKey="pred" stroke={COLORS.trace} strokeWidth={1.6} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
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
                  <Cell key={l.name} fill={["Wake effect", "Yaw error"].includes(l.name) ? COLORS.warn : COLORS.trace} opacity={0.85} />
                ))}
                <LabelList dataKey="mwh" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <SectionFooter text="Simulated data · WindIQ integrates via existing SCADA/OPC-UA — no turbine controller changes required" />
    </>
  );
}
