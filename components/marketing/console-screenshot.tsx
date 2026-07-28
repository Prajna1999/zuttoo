import { COLORS as C, mulberry32 } from "@/lib/design-system";

// Static, hand-built replicas of each product console (same palette, fonts,
// and numbers as the live demos) framed as a browser screenshot.

function Ring({ value, color, size = 34 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth="3" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray={`${(value / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill={C.text} fontSize={size / 3.4} fontFamily="var(--font-mono)" fontWeight="600">
        {value}
      </text>
    </svg>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="text-[7px] font-semibold tracking-[0.08em]" style={{ color: C.dim }}>
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function StatusLine({ color, text }: { color: string; text: string }) {
  return (
    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[8px]" style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.dim }}>
      <span style={{ color }}>●</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function AssetIQShot() {
  const rnd = mulberry32(42);
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const daily = Math.sin((i / 48) * Math.PI * 2) * 7;
    const drift = i > 28 ? Math.pow((i - 28) / 20, 2) * 26 : 0;
    pts.push(`${i * 7},${(62 - daily - drift + (rnd() - 0.5) * 4).toFixed(1)}`);
  }
  return (
    <>
      <div className="flex gap-2">
        {[
          { id: "TX-097", ring: 62, color: C.warn, rul: "RUL 41d", label: "DEGRADING" },
          { id: "INV-212", ring: 37, color: C.crit, rul: "RUL 9d", label: "CRITICAL" },
        ].map((a) => (
          <div key={a.id} className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
            <Ring value={a.ring} color={a.color} />
            <div>
              <div className="text-[9px] font-semibold" style={{ color: C.text }}>{a.id}</div>
              <div className="text-[7px]" style={{ color: a.color }}>{a.label}</div>
              <div className="text-[7px]" style={{ color: C.dim }}>{a.rul}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-lg p-2.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="flex justify-between text-[7px]" style={{ color: C.dim }}>
          <span>TX-097 · TEMP °C · LAST 24H</span>
          <span style={{ color: C.faint }}>threshold 68°</span>
        </div>
        <svg viewBox="0 0 336 84" className="mt-1.5 h-auto w-full" aria-hidden>
          {[21, 42, 63].map((y) => (
            <line key={y} x1="0" y1={y} x2="336" y2={y} stroke={C.line} strokeWidth="0.6" strokeDasharray="2 5" />
          ))}
          <rect x="252" y="0" width="84" height="84" fill={C.crit} opacity="0.07" />
          <line x1="0" y1="26" x2="336" y2="26" stroke={C.warn} strokeWidth="0.8" strokeDasharray="5 4" />
          <polyline points={pts.join(" ")} fill="none" stroke={C.trace} strokeWidth="1.4" />
        </svg>
      </div>
      <StatusLine color={C.crit} text="14:32 · INV-212 efficiency 3.8% below baseline — failure window ≤ 9 days" />
    </>
  );
}

function GridSenseShot() {
  const feeders = [
    { id: "F-03", input: 62, billed: 58, color: C.healthy },
    { id: "F-07", input: 54, billed: 40, color: C.crit },
    { id: "F-11", input: 45, billed: 41, color: C.warn },
    { id: "F-14", input: 29, billed: 27, color: C.healthy },
    { id: "F-19", input: 37, billed: 25, color: C.crit },
  ];
  return (
    <>
      <div className="flex gap-2">
        <Kpi label="AT&C LOSS" value="15.5%" color={C.warn} />
        <Kpi label="METERS ONLINE" value="21,885" color={C.healthy} />
        <Kpi label="SUSPECTS" value="7" color={C.crit} />
      </div>
      <div className="mt-2.5 rounded-lg p-2.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="text-[7px] font-semibold tracking-[0.08em]" style={{ color: C.dim }}>
          FEEDER INPUT vs BILLED (MWh, 30D)
        </div>
        <div className="mt-2 flex items-end gap-3" style={{ height: 72 }}>
          {feeders.map((f) => (
            <div key={f.id} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 60 }}>
                <div className="w-2.5 rounded-t-sm" style={{ height: f.input, background: C.trace, opacity: 0.45 }} />
                <div className="w-2.5 rounded-t-sm" style={{ height: f.billed, background: f.color, opacity: 0.9 }} />
              </div>
              <span className="text-[7px]" style={{ color: C.dim }}>{f.id}</span>
            </div>
          ))}
        </div>
      </div>
      <StatusLine color={C.crit} text="C-88412 · score 0.94 · consumption −71% after meter swap · ~2,400 kWh/mo unbilled" />
    </>
  );
}

function SolarIQShot() {
  const rnd = mulberry32(7);
  const rows = Array.from({ length: 10 }, (_, inv) =>
    Array.from({ length: 18 }, (_, s) => {
      if (inv === 3 && s >= 6 && s <= 9) return C.crit;
      if (inv === 8 && s === 14) return "#3A3F46";
      if (inv === 6) return C.warn;
      if (inv === 1 && s >= 15) return C.warn;
      return rnd() > 0.97 ? C.warn : C.healthy;
    })
  );
  return (
    <>
      <div className="flex gap-2">
        <Kpi label="PLANT PR" value="93.1%" color={C.warn} />
        <Kpi label="FAULT STRINGS" value="6 / 180" color={C.crit} />
        <Kpi label="RECOVERABLE" value="103 MWh/yr" color={C.warn} />
      </div>
      <div className="mt-2.5 rounded-lg p-2.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="text-[7px] font-semibold tracking-[0.08em]" style={{ color: C.dim }}>
          STRING PR — INVERTERS × STRINGS
        </div>
        <div className="mt-2 space-y-[3px]">
          {rows.map((row, inv) => (
            <div key={inv} className="flex items-center gap-[3px]">
              <span className="w-8 text-[6px]" style={{ color: C.faint }}>
                INV-{String(inv + 1).padStart(2, "0")}
              </span>
              {row.map((color, s) => (
                <span
                  key={s}
                  className="h-[7px] flex-1 rounded-[1px]"
                  style={{ background: color, opacity: color === C.healthy ? 0.5 : 0.95 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <StatusLine color={C.crit} text="INV-04 · strings 7–10 (PR ~64%) — check combiner box CB-04-B fuses · +38 MWh/yr" />
    </>
  );
}

function WindIQShot() {
  const wtgs = [
    { id: "WTG-01", v: 97, color: C.healthy },
    { id: "WTG-02", v: 95, color: C.healthy },
    { id: "WTG-03", v: 58, color: C.crit },
    { id: "WTG-04", v: 91, color: C.healthy },
    { id: "WTG-05", v: 76, color: C.warn },
    { id: "WTG-06", v: 94, color: C.healthy },
    { id: "WTG-07", v: 41, color: C.crit },
    { id: "WTG-08", v: 89, color: C.healthy },
  ];
  return (
    <>
      <div className="flex gap-2">
        <Kpi label="AVAILABILITY" value="96.2%" color={C.healthy} />
        <Kpi label="FLAGGED" value="2 / 8" color={C.crit} />
        <Kpi label="RECOVERABLE" value="134 MWh/yr" color={C.warn} />
      </div>
      <div className="mt-2.5 space-y-[5px] rounded-lg p-2.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        <div className="text-[7px] font-semibold tracking-[0.08em]" style={{ color: C.dim }}>
          POWER CURVE CONFORMANCE
        </div>
        {wtgs.map((w) => (
          <div key={w.id} className="flex items-center gap-2">
            <span className="w-9 text-[7px]" style={{ color: C.text }}>{w.id}</span>
            <div className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: C.bg }}>
              <div className="h-full rounded-full" style={{ width: `${w.v}%`, background: `linear-gradient(90deg, ${w.color}44, ${w.color})` }} />
            </div>
            <span className="w-6 text-right text-[7px]" style={{ color: w.color }}>{w.v}%</span>
          </div>
        ))}
      </div>
      <StatusLine color={C.crit} text="WTG-07 · gearbox vibration 3.1× baseline — ground turbine, borescope within 48h" />
    </>
  );
}

const SHOTS: Record<string, { title: string; render: () => React.ReactNode }> = {
  assetiq: { title: "AssetIQ · Predictive Maintenance", render: AssetIQShot },
  gridsense: { title: "GridSense · Division 4 · 21,885 meters", render: GridSenseShot },
  solariq: { title: "SolarIQ · Pooling Station 3 · 5 MWp", render: SolarIQShot },
  windiq: { title: "WindIQ · Wind Farm 2 · 42 MW", render: WindIQShot },
};

export function ConsoleScreenshot({ id }: { id: string }) {
  const shot = SHOTS[id];
  return (
    <div className="overflow-hidden rounded-2xl border border-mk-border shadow-lg">
      <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="ml-3 rounded-md bg-mk-bg px-3 py-1 font-mono text-[10px] text-mk-ink-faint">
          app.zuttoo.io/{id}
        </span>
      </div>
      <div className="p-4 font-mono" style={{ background: C.bg }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold" style={{ color: C.text }}>{shot.title}</span>
          <span className="text-[8px]" style={{ color: C.healthy }}>● LIVE FEED</span>
        </div>
        {shot.render()}
      </div>
    </div>
  );
}
