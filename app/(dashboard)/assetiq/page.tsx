"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceArea,
} from "recharts";
import { COLORS, TOOLTIP_STYLE, mulberry32 } from "@/lib/design-system";
import { HealthRing } from "@/components/health-ring";
import { Spark } from "@/components/spark";
import { SectionFooter } from "@/components/section-footer";

type Risk = "low" | "warn" | "crit";

const ASSETS: {
  id: string; name: string; site: string; health: number; rulDays: number;
  risk: Risk; seed: number; degrading: boolean; drivers: { f: string; w: number }[];
}[] = [
  { id: "TX-104", name: "Power Transformer 104", site: "Substation A · 33/11 kV", health: 91, rulDays: 210, risk: "low", seed: 11, degrading: false,
    drivers: [{ f: "Oil temperature stability", w: 0.34 }, { f: "Load balance", w: 0.28 }, { f: "Dissolved gas trend", w: 0.21 }] },
  { id: "TX-097", name: "Power Transformer 097", site: "Substation A · 33/11 kV", health: 62, rulDays: 41, risk: "warn", seed: 42, degrading: true,
    drivers: [{ f: "Winding temp rise vs load", w: 0.41 }, { f: "Cooling fan duty cycle", w: 0.33 }, { f: "Top-oil temp drift", w: 0.19 }] },
  { id: "INV-212", name: "Solar Inverter 212", site: "Pooling Station 3 · 5 MW", health: 37, rulDays: 9, risk: "crit", seed: 77, degrading: true,
    drivers: [{ f: "DC/AC efficiency drop", w: 0.46 }, { f: "IGBT heatsink temp", w: 0.31 }, { f: "Ripple current anomaly", w: 0.17 }] },
  { id: "MTR-018", name: "Induction Motor 018", site: "Plant Line 2 · 75 kW", health: 84, rulDays: 156, risk: "low", seed: 5, degrading: false,
    drivers: [{ f: "Vibration RMS (axial)", w: 0.37 }, { f: "Bearing temp", w: 0.3 }, { f: "Current harmonics", w: 0.22 }] },
];
const RISK_META: Record<Risk, { color: string; label: string }> = {
  low: { color: COLORS.healthy, label: "HEALTHY" },
  warn: { color: COLORS.warn, label: "DEGRADING" },
  crit: { color: COLORS.crit, label: "CRITICAL" },
};
const ASSET_ALERTS = [
  { time: "14:32", asset: "INV-212", sev: "crit", msg: "Efficiency 3.8% below model baseline for 6h — failure window ≤ 9 days", action: "Schedule IGBT module inspection" },
  { time: "11:07", asset: "TX-097", sev: "warn", msg: "Winding temp rising 0.4°C/day faster than load profile explains", action: "Verify cooling bank #2 fans" },
  { time: "09:51", asset: "TX-097", sev: "warn", msg: "Anomaly cluster: 7 correlated deviations suppressed into 1 event", action: "Review consolidated event" },
  { time: "06:15", asset: "MTR-018", sev: "low", msg: "Bearing temp anomaly cleared — returned to baseline", action: "No action needed" },
];

function genTelemetry(seed: number, degrading: boolean) {
  const rnd = mulberry32(seed);
  return Array.from({ length: 96 }, (_, i) => {
    const drift = degrading ? Math.pow(i / 96, 2.4) * 26 : 0;
    const daily = Math.sin((i / 96) * Math.PI * 2) * 3.5;
    return {
      t: i,
      label: `${String(Math.floor((i * 15) / 60)).padStart(2, "0")}:${String((i * 15) % 60).padStart(2, "0")}`,
      temp: +(54 + daily + drift + (rnd() - 0.5) * 2.2).toFixed(1),
      vib: +(1.8 + (degrading ? Math.pow(i / 96, 3) * 3.1 : 0) + (rnd() - 0.5) * 0.35).toFixed(2),
    };
  });
}

function FailureHorizon({
  assets, selected, onSelect,
}: { assets: typeof ASSETS; selected: string; onSelect: (id: string) => void }) {
  const maxDays = 240;
  return (
    <div className="rounded-[10px] border border-line bg-panel px-[18px] py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-[0.08em] text-dim">
          FAILURE HORIZON — PREDICTED TIME TO INTERVENTION
        </span>
        <span className="font-mono text-[11px] text-faint">next 240 days</span>
      </div>
      {assets.map((a) => {
        const meta = RISK_META[a.risk];
        const pct = Math.min(a.rulDays / maxDays, 1) * 100;
        return (
          <div
            key={a.id}
            onClick={() => onSelect(a.id)}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-[7px]"
            style={{ background: selected === a.id ? COLORS.panelSoft : "transparent" }}
          >
            <span className="w-16 font-mono text-xs">{a.id}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
              <div
                className="absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}44, ${meta.color})` }}
              />
              <div
                className="absolute -top-0.5 -bottom-0.5 w-0.5"
                style={{ left: `${pct}%`, background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
              />
            </div>
            <span className="w-[72px] text-right font-mono text-xs" style={{ color: meta.color }}>
              {a.rulDays}d
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AssetIQPage() {
  const [selectedId, setSelectedId] = useState("INV-212");
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(true);
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(iv);
  }, [live]);

  const asset = ASSETS.find((a) => a.id === selectedId)!;
  const meta = RISK_META[asset.risk];
  const telemetry = useMemo(() => genTelemetry(asset.seed + Math.floor(tick / 4), asset.degrading), [asset, tick]);
  const cardTelemetry = useMemo(
    () => Object.fromEntries(ASSETS.map((a) => [a.id, genTelemetry(a.seed, a.degrading).filter((_, i) => i % 4 === 0)])),
    []
  );
  const anomalyStart = asset.degrading ? 68 : null;
  const threshold = asset.id === "INV-212" ? 72 : 68;
  const visibleAlerts = ASSET_ALERTS.filter((al) => al.asset === selectedId);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-dim">AI predictive maintenance · fleet of 4 monitored assets</div>
        <button
          onClick={() => setLive((l) => !l)}
          className="cursor-pointer rounded-md border px-3 py-1.5 font-mono text-[11px]"
          style={{ borderColor: live ? COLORS.healthy : COLORS.line, color: live ? COLORS.healthy : COLORS.dim }}
        >
          {live ? "● LIVE FEED" : "○ PAUSED"}
        </button>
      </div>

      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(215px,1fr))] gap-3">
        {ASSETS.map((a) => {
          const m = RISK_META[a.risk];
          const sel = a.id === selectedId;
          return (
            <div
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className="cursor-pointer rounded-[10px] border p-3.5 transition-colors"
              style={{ borderColor: sel ? m.color : COLORS.line, background: COLORS.panel }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[13px] font-semibold">{a.id}</div>
                  <div className="mt-0.5 text-[11px] text-dim">{a.name}</div>
                  <div className="text-[10px] text-faint">{a.site}</div>
                </div>
                <HealthRing value={a.health} color={m.color} size={52} />
              </div>
              <div className="mt-2">
                <Spark data={cardTelemetry[a.id]} color={m.color} />
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="font-mono text-[10px] tracking-[0.06em]" style={{ color: m.color }}>
                  {m.label}
                </span>
                <span className="font-mono text-[10px] text-dim">RUL {a.rulDays}d</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3.5">
        <FailureHorizon assets={ASSETS} selected={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1">
            <div>
              <span className="text-[13px] font-semibold">{asset.name}</span>
              <span className="ml-2.5 font-mono text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
            </div>
            <span className="font-mono text-[10px] text-faint">temp °C · last 24h</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={telemetry} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} interval={15} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} domain={[45, 90]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              {anomalyStart && <ReferenceArea x1={telemetry[anomalyStart].label} x2={telemetry[95].label} fill={meta.color} fillOpacity={0.08} />}
              <ReferenceLine y={threshold} stroke={COLORS.warn} strokeDasharray="6 4" />
              <Line type="monotone" dataKey="temp" stroke={COLORS.trace} strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          {anomalyStart && (
            <div className="mt-1 font-mono text-[11px]" style={{ color: meta.color }}>
              ▲ anomaly window — residual exceeded for {((96 - anomalyStart) * 15) / 60}h
            </div>
          )}
          <div className="mt-3.5">
            <div className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-dim">TOP CONTRIBUTING SIGNALS</div>
            {asset.drivers.map((d) => (
              <div key={d.f} className="mb-1.5 flex items-center gap-2.5">
                <span className="w-32 flex-shrink-0 text-xs sm:w-[220px]">{d.f}</span>
                <div className="h-1.5 flex-1 rounded-sm bg-bg">
                  <div className="h-full rounded-sm opacity-85" style={{ width: `${d.w * 100}%`, background: meta.color }} />
                </div>
                <span className="w-9 text-right font-mono text-[11px] text-dim">{Math.round(d.w * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="rounded-[10px] border border-line bg-panel p-4">
            <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">PREDICTION</div>
            <div className="flex items-center gap-3.5">
              <HealthRing value={asset.health} color={meta.color} size={72} />
              <div>
                <div className="font-mono text-[22px] font-semibold" style={{ color: meta.color }}>{asset.rulDays} days</div>
                <div className="text-[11px] text-dim">estimated remaining useful life</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-panel-soft px-3 py-2.5" style={{ borderLeft: `3px solid ${meta.color}` }}>
              <div className="mb-0.5 text-[10px] text-dim">Recommended action</div>
              <div className="text-[12.5px]">
                {asset.risk === "crit" && "Dispatch inspection within 72h. Order IGBT spares now."}
                {asset.risk === "warn" && "Plan cooling-system service in next maintenance window (≤ 3 weeks)."}
                {asset.risk === "low" && "No intervention needed. Next scheduled review in 30 days."}
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-[10px] border border-line bg-panel p-4">
            <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">INTELLIGENT ALERTS — {selectedId}</div>
            {visibleAlerts.length === 0 && <div className="text-xs text-faint">No open alerts. Select TX-097 or INV-212.</div>}
            {visibleAlerts.map((al, i) => {
              const sc = al.sev === "crit" ? COLORS.crit : al.sev === "warn" ? COLORS.warn : COLORS.healthy;
              return (
                <div
                  key={i}
                  className="mb-3 pb-3"
                  style={{ borderBottom: i < visibleAlerts.length - 1 ? `1px solid ${COLORS.line}` : "none" }}
                >
                  <div className="flex gap-2">
                    <span className="font-mono text-[10px]" style={{ color: sc }}>●</span>
                    <span className="font-mono text-[10px] text-faint">{al.time}</span>
                  </div>
                  <div className="mt-0.5 text-xs leading-[1.45]">{al.msg}</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: sc }}>→ {al.action}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SectionFooter text="Simulated data · Zuttoo AssetIQ runs on existing telemetry — no new hardware required" />
    </>
  );
}
