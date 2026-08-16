"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid,
  ComposedChart, BarChart, Bar, Cell, LabelList, Line,
} from "recharts";
import { COLORS, TOOLTIP_STYLE } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";
import REAL from "@/lib/windiq-real.json";

// Real SCADA data: Kelmarsh wind farm (Cubico, CC-BY-4.0), built by
// python/scripts/build-windiq-data.py from zenodo.org/records/5841834.

type Status = "low" | "warn" | "crit";
const STATUS_META: Record<Status, { color: string; label: string }> = {
  low: { color: COLORS.healthy, label: "NOMINAL" },
  warn: { color: COLORS.warn, label: "DEGRADED" },
  crit: { color: COLORS.crit, label: "CRITICAL" },
};

type Turbine = (typeof REAL.turbines)[number];

function statusOf(t: Turbine): Status {
  if (t.availability < 80 || t.conformance < 85) return "crit";
  if (t.availability < 90 || (t.worstBandRatio ?? 100) < 85) return "warn";
  return "low";
}

function diagnose(t: Turbine): { issue: string; action: string } {
  const s = statusOf(t);
  if (s === "crit")
    return {
      issue: `Energy-based availability ${t.availability}% over the period — ${t.deficitMwh > 0 ? `${t.deficitMwh} MWh below fleet reference, ` : ""}extended forced-outage time is the dominant loss on this unit.`,
      action: "Review the stop log and root-cause the longest forced outages; prioritise for next maintenance window.",
    };
  if (s === "warn")
    return {
      issue: `Power curve at ${t.worstBandRatio}% of fleet reference in the ${t.worstBand} band; availability ${t.availability}%. Deficit ${t.deficitMwh} MWh vs reference over the period.`,
      action: `Inspect anemometry and pitch/yaw behaviour in the ${t.worstBand} regime. Est. recovery up to ${t.deficitMwh} MWh/yr.`,
    };
  return {
    issue: `Power curve tracking the fleet reference within tolerance (${t.conformance}% conformance, availability ${t.availability}%).`,
    action: "No action needed.",
  };
}

export default function WindIQDemo() {
  const [selId, setSelId] = useState(
    REAL.turbines.reduce((a, b) => (statusOf(b) === "crit" ? b : a)).id
  );
  const sel = REAL.turbines.find((t) => t.id === selId)!;
  const meta = STATUS_META[statusOf(sel)];
  const diag = diagnose(sel);

  const generation = useMemo(
    () => REAL.generation.map((g) => ({ ...g, hi: +(g.pred * 1.08).toFixed(2), lo: +(g.pred * 0.92).toFixed(2) })),
    []
  );
  const avgAvail = (REAL.turbines.reduce((s, t) => s + t.availability, 0) / REAL.turbines.length).toFixed(1);
  const avgConformance = (REAL.turbines.reduce((s, t) => s + t.conformance, 0) / REAL.turbines.length).toFixed(1);
  const recoverable = Math.round(REAL.turbines.reduce((s, t) => s + t.deficitMwh, 0));
  const flagged = REAL.turbines.filter((t) => statusOf(t) !== "low").length;
  const critCount = REAL.turbines.filter((t) => statusOf(t) === "crit").length;

  return (
    <>
      <div className="mb-4 text-xs text-dim">
        {REAL.farm.name} · {REAL.farm.capacityMw} MW · {REAL.turbines.length} × {REAL.farm.turbineType} · real SCADA data
      </div>
      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard label="FLEET AVAILABILITY" value={`${avgAvail}%`} sub="energy-based, full period" color={+avgAvail < 90 ? COLORS.warn : COLORS.healthy} />
        <KPICard label="POWER CURVE CONFORMANCE" value={`${avgConformance}%`} sub="vs fleet reference curve" color={+avgConformance < 85 ? COLORS.warn : COLORS.healthy} />
        <KPICard label="RECOVERABLE LOSS" value={`${recoverable} MWh/yr`} sub={`≈ ₹${(recoverable * 4500 / 1e5).toFixed(1)}L at PPA rate`} color={COLORS.warn} />
        <KPICard label="TURBINES FLAGGED" value={`${flagged} / ${REAL.turbines.length}`} sub={`${critCount} critical, ${flagged - critCount} warning`} color={critCount ? COLORS.crit : COLORS.warn} />
      </div>

      <div className="mb-3.5 rounded-[10px] border border-line bg-panel px-[18px] py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold tracking-[0.08em] text-dim">TURBINE FLEET — POWER CURVE CONFORMANCE</span>
          <span className="font-mono text-[11px] text-faint">click to diagnose</span>
        </div>
        {REAL.turbines.map((t) => {
          const m = STATUS_META[statusOf(t)];
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
                  style={{ width: `${Math.min(t.conformance, 100)}%`, background: `linear-gradient(90deg, ${m.color}44, ${m.color})` }}
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
          <span className="font-mono text-[11px]" style={{ color: meta.color }}>
            {meta.label} · {sel.conformance}% conformance · {sel.availability}% availability
          </span>
        </div>
        <div className="text-xs leading-[1.55]">{diag.issue}</div>
        <div className="mt-2.5 rounded-lg bg-panel-soft px-3 py-2.5" style={{ borderLeft: `3px solid ${meta.color}` }}>
          <div className="mb-0.5 text-[10px] text-dim">Recommended action</div>
          <div className="text-xs">{diag.action}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">
            FARM OUTPUT vs POTENTIAL (MW) · {REAL.windowDate} · 24h
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={generation} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={7} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Area dataKey="hi" stroke="none" fill={COLORS.trace} fillOpacity={0.1} />
              <Area dataKey="lo" stroke="none" fill={COLORS.bg} fillOpacity={1} />
              <Line dataKey="pred" name="potential" stroke={COLORS.trace} strokeWidth={1.6} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="actual" stroke={COLORS.healthy} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">LOSS ATTRIBUTION (MWh, IEC categories)</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={REAL.losses} layout="vertical" margin={{ top: 0, right: 34, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: COLORS.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="mwh" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {REAL.losses.map((l, i) => (
                  <Cell key={l.name} fill={i === 0 ? COLORS.crit : COLORS.trace} opacity={0.85} />
                ))}
                <LabelList dataKey="mwh" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <SectionFooter text="Real SCADA data — Kelmarsh wind farm, Cubico Sustainable Investments (CC-BY-4.0) · WindIQ integrates with your existing plant data systems" />
    </>
  );
}
