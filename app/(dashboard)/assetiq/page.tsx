"use client";

import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
  BarChart, Bar, Cell, LabelList, ReferenceLine,
} from "recharts";
import { COLORS, TOOLTIP_STYLE } from "@/lib/design-system";
import { KPICard } from "@/components/kpi-card";
import { SectionFooter } from "@/components/section-footer";
import REAL from "@/lib/assetiq-real.json";

// Real predictive-maintenance data: NASA C-MAPSS FD001 turbofan degradation, built by
// python/scripts/build-assetiq-data.py from the executed notebook's artifacts.

const BAND_SHORT: Record<string, string> = {
  "≤ 30 cycles (near failure)": "≤30",
  "30-60": "30–60",
  "60-100": "60–100",
  "> 100 cycles (early life)": ">100",
};
const MODEL_LABEL: Record<string, string> = {
  constant: "constant",
  ridge: "ridge",
  transformer: "transformer",
  gbdt: "GBDT",
};
const MODEL_COLOR: Record<string, string> = {
  constant: COLORS.faint,
  ridge: COLORS.warn,
  transformer: COLORS.trace,
  gbdt: COLORS.healthy,
};

export default function AssetIQDemo() {
  const k = REAL.kpis;

  const maxRul = Math.max(...REAL.queue.map((q) => Math.max(q.predRul, q.trueRul)));
  const queue = {
    rows: [...REAL.queue].reverse(),
    maxRul: Math.ceil((maxRul + 4) / 10) * 10,
  };

  const n = Math.max(...REAL.healthCurves.map((c) => c.cycles.length));
  const health = Array.from({ length: n }, (_, i) => {
    const row: Record<string, number | null> = { c: i };
    REAL.healthCurves.forEach((c) => {
      row[c.engine] = c.health[i] ?? null;
    });
    return row;
  });

  const models = (["gbdt", "transformer", "ridge", "constant"] as const).map((id) => ({
    id,
    label: MODEL_LABEL[id],
    rmse: REAL.modelCompare[id],
    mae: REAL.modelCompareMae[id],
  }));

  const alerts = (["gbdt", "transformer", "ridge"] as const).map((id) => ({
    id,
    label: MODEL_LABEL[id],
    ...REAL.alerts[id],
    primary: id === "gbdt",
  }));

  const curves = REAL.healthCurves.map((c, i) => ({
    key: c.engine,
    color: [COLORS.healthy, COLORS.trace, COLORS.crit, COLORS.warn][i],
    label: `${c.engine} · ${c.cyclesToFailure} flights`,
  }));

  const hist = REAL.fleetHist.map((h) => ({ ...h, label: `${h.lo}–${h.hi}` }));

  return (
    <>
      <div className="mb-4 text-xs text-dim">
        Predictive maintenance · {REAL.fleet.name} · {REAL.fleet.testEngines} held-out engines ·{" "}
        {REAL.fleet.sensors} sensors ({REAL.fleet.informativeSensors} informative) ·{" "}
        {REAL.fleet.regime}
      </div>

      <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KPICard
          label="RUL FORECAST ERROR"
          value={`${k.rulMaeCycles} cyc`}
          sub={`GBDT test MAE · RMSE ${k.rulRmseCycles} · 100 held-out engines`}
          color={COLORS.trace}
        />
        <KPICard
          label="NEAR-FAILURE CAUGHT"
          value={`${k.caught} / ${k.nearFailure}`}
          sub={`${Math.round(k.alertRecall * 100)}% recall at ≤ 30-cycle dispatch threshold`}
          color={COLORS.healthy}
        />
        <KPICard
          label="ALERT PRECISION"
          value={`${Math.round(k.alertPrecision * 100)}%`}
          sub={`${k.alertsIssued} alerts issued · ${k.alertsIssued - k.caught} false alarm · ${k.missed} missed`}
          color={k.alertPrecision > 0.9 ? COLORS.healthy : COLORS.warn}
        />
        <KPICard
          label="INFORMATIVE SENSORS"
          value={`${REAL.fleet.informativeSensors} / ${REAL.fleet.sensors}`}
          sub={`${REAL.fleet.constantSensors.length} constant channels screened out`}
          color={COLORS.healthy}
        />
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">FLEET HEALTH — DEGRADATION CURVES</span>
            <span className="font-mono text-[10px] text-faint">descriptive index · s11·s4·s2 · train engines</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={health} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="c" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis domain={[0, 1]} tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              {curves.map((c) => (
                <Line key={c.key} type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {curves.map((c) => (
              <span key={c.key} className="font-mono text-[10px]" style={{ color: c.color }}>— {c.label}</span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">CYCLES TO FAILURE — 100 TRAIN ENGINES</span>
            <span className="font-mono text-[10px] text-faint">median {REAL.fleet.medianTtfCycles} flights</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hist} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="count" name="engines" fill={COLORS.trace} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="count" position="top" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-3.5 rounded-[10px] border border-line bg-panel p-4">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1.5">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">MAINTENANCE QUEUE — PREDICTED RUL, TEST ENGINES (top 12)</span>
          <span className="font-mono text-[10px] text-faint">GBDT · dispatch threshold ≤ 30 cycles ≈ flights · bar = predicted, ghost = true</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={queue.rows} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, queue.maxRul]} hide />
            <YAxis type="category" dataKey="id" width={62} tick={{ fill: COLORS.dim, fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
            <ReferenceLine x={30} stroke={COLORS.warn} strokeDasharray="6 4" />
            <Bar dataKey="trueRul" name="true RUL" fill={COLORS.healthy} fillOpacity={0.22} barSize={9} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="predRul" name="pred RUL" barSize={9} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {queue.rows.map((q) => (
                <Cell key={q.id} fill={q.alert ? COLORS.crit : COLORS.warn} />
              ))}
              <LabelList dataKey="predRul" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 10 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">PREDICTION ERROR BY LIFE-STAGE (GBDT · test engines)</span>
            <span className="font-mono text-[10px] text-faint">RMSE cycles</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={REAL.bands.map((b) => ({ ...b, short: BAND_SHORT[b.band] }))} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="short" tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="rmse" name="RMSE" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {REAL.bands.map((b) => (
                  <Cell key={b.band} fill={b.rmse > 14 ? COLORS.warn : COLORS.trace} />
                ))}
                <LabelList dataKey="rmse" position="top" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1.5 text-[11px] leading-[1.5] text-dim">
            Most accurate exactly where it matters: engines within 30 flights of failure (MAE {REAL.bands[0].mae} cycles).
            Mid-life is hardest — the piecewise 125-cycle cap leaves genuine ambiguity.
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-dim">MODEL COMPARISON — TEST RMSE (cycles)</span>
            <span className="font-mono text-[10px] text-faint">100 held-out engines</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={models} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={96} tick={{ fill: COLORS.dim, fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="rmse" name="test RMSE" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
                {models.map((md) => (
                  <Cell key={md.id} fill={MODEL_COLOR[md.id]} />
                ))}
                <LabelList dataKey="rmse" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1.5 text-[11px] leading-[1.5] text-dim">
            GBDT on engineered window statistics wins; the raw-window transformer beats ridge but not the
            engineered features at 100 training engines — the same classical-vs-attention finding as the wind, solar and grid notebooks.
          </div>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">TOP CONTRIBUTING SIGNALS</div>
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={[...REAL.importance].reverse().map((s) => ({ ...s, signal: s.signal.replace("_", " ") }))} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="signal" width={86} tick={{ fill: COLORS.dim, fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: COLORS.dim }} itemStyle={{ color: COLORS.text }} />
              <Bar dataKey="score" name="perm. importance" radius={[0, 4, 4, 0]} barSize={9} isAnimationActive={false}>
                {[...REAL.importance].reverse().map((s) => (
                  <Cell key={s.signal} fill={COLORS.trace} />
                ))}
                <LabelList dataKey="score" position="right" style={{ fill: COLORS.dim, fontFamily: "var(--font-mono)", fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1.5 text-[11px] leading-[1.5] text-dim">
            Degradation *rate* (slope over the last 30 flights) of the turbine sensors dominates — the
            model is reading wear speed, not just level.
          </div>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-dim">DISPATCH SIMULATION — ALERT AT ≤ 30 CYCLES</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-mono text-[10px] text-faint">
                  <th className="pb-2 pr-3 font-medium">model</th>
                  <th className="pb-2 pr-3 font-medium">alerts</th>
                  <th className="pb-2 pr-3 font-medium">TP</th>
                  <th className="pb-2 pr-3 font-medium">FP</th>
                  <th className="pb-2 pr-3 font-medium">missed</th>
                  <th className="pb-2 pr-3 font-medium">prec</th>
                  <th className="pb-2 pr-3 font-medium">recall</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-t border-line font-mono text-xs" style={{ color: a.primary ? COLORS.text : COLORS.dim }}>
                    <td className="py-2 pr-3" style={{ color: MODEL_COLOR[a.id] }}>{a.label}</td>
                    <td className="py-2 pr-3">{a.alerts}</td>
                    <td className="py-2 pr-3" style={{ color: COLORS.healthy }}>{a.tp}</td>
                    <td className="py-2 pr-3">{a.fp}</td>
                    <td className="py-2 pr-3">{a.missed}</td>
                    <td className="py-2 pr-3">{(a.precision * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-3">{(a.recall * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2.5 text-[11px] leading-[1.5] text-dim">
            Of 25 test engines that truly fail within 30 flights, GBDT catches {k.caught} with {k.alertsIssued - k.caught} false alarm;
            the slightly higher recall of the transformer ({(REAL.alerts.transformer.recall * 100).toFixed(0)}%) is a
            calibration artifact, not a modeling win.
          </div>
        </div>
      </div>

      <SectionFooter text={`Real predictive-maintenance data — NASA C-MAPSS FD001 turbofan degradation (${REAL.fleet.trainEngines} run-to-failure engines · ${REAL.fleet.sensors} sensors) · GBDT RUL model trained on ${REAL.fleet.trainFlights.toLocaleString()} flight cycles · AssetIQ runs on the telemetry you already collect`} />
    </>
  );
}
