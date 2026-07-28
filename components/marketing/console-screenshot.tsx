import { COLORS as C, mulberry32 } from "@/lib/design-system";

// Each console replica is a single SVG with a fixed viewBox, so the whole
// "screenshot" scales proportionally at any container width — nothing inside
// can overflow. Numbers mirror the live demos.

const W = 380;
const H = 258;

function KpiBox({ x, label, value, color }: { x: number; label: string; value: string; color: string }) {
  return (
    <g>
      <rect x={x} y={30} width={112} height={40} rx={6} fill={C.panel} stroke={C.line} />
      <text x={x + 8} y={44} fontSize={6.5} fill={C.dim} letterSpacing="0.6" fontWeight={600}>
        {label}
      </text>
      <text x={x + 8} y={61} fontSize={12} fill={color} fontWeight={600}>
        {value}
      </text>
    </g>
  );
}

function KpiRow({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <>
      {items.map((it, i) => (
        <KpiBox key={it.label} x={14 + i * 120} {...it} />
      ))}
    </>
  );
}

function Panel({ title }: { title: string }) {
  return (
    <>
      <rect x={14} y={78} width={352} height={126} rx={8} fill={C.panel} stroke={C.line} />
      <text x={22} y={93} fontSize={7} fill={C.dim} letterSpacing="0.6" fontWeight={600}>
        {title}
      </text>
    </>
  );
}

function StatusBar({ color, text }: { color: string; text: string }) {
  return (
    <g>
      <rect x={14} y={212} width={352} height={26} rx={8} fill={C.panel} stroke={C.line} />
      <circle cx={26} cy={225} r={2.5} fill={color} />
      <text x={35} y={228} fontSize={8} fill={C.dim}>
        {text}
      </text>
    </g>
  );
}

function Scene({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" style={{ fontFamily: "var(--font-mono)" }} aria-hidden>
      <rect width={W} height={H} fill={C.bg} />
      <text x={14} y={20} fontSize={10} fill={C.text} fontWeight={700}>
        {title}
      </text>
      <text x={366} y={20} fontSize={8} fill={C.healthy} textAnchor="end">
        ● LIVE FEED
      </text>
      {children}
    </svg>
  );
}

function AssetChip({ x, id, ring, color, label, rul }: { x: number; id: string; ring: number; color: string; label: string; rul: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  return (
    <g>
      <rect x={x} y={30} width={172} height={40} rx={6} fill={C.panel} stroke={C.line} />
      <circle cx={x + 24} cy={50} r={r} stroke={C.line} strokeWidth={3} fill="none" />
      <circle
        cx={x + 24}
        cy={50}
        r={r}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeDasharray={`${(ring / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${x + 24} 50)`}
      />
      <text x={x + 24} y={53} fontSize={9} fill={C.text} fontWeight={600} textAnchor="middle">
        {ring}
      </text>
      <text x={x + 46} y={42} fontSize={9} fill={C.text} fontWeight={600}>
        {id}
      </text>
      <text x={x + 46} y={53} fontSize={7} fill={color}>
        {label}
      </text>
      <text x={x + 46} y={63} fontSize={7} fill={C.dim}>
        {rul}
      </text>
    </g>
  );
}

function AssetIQShot() {
  const rnd = mulberry32(42);
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const daily = Math.sin((i / 48) * Math.PI * 2) * 8;
    const drift = i > 28 ? Math.pow((i - 28) / 20, 2) * 42 : 0;
    const y = Math.max(104, 172 - daily - drift + (rnd() - 0.5) * 5);
    pts.push(`${22 + i * 7},${y.toFixed(1)}`);
  }
  return (
    <Scene title="AssetIQ · Predictive Maintenance">
      <AssetChip x={14} id="TX-097" ring={62} color={C.warn} label="DEGRADING" rul="RUL 41d" />
      <AssetChip x={194} id="INV-212" ring={37} color={C.crit} label="CRITICAL" rul="RUL 9d" />
      <Panel title="TX-097 — TEMP °C · LAST 24H" />
      {[122, 147, 172].map((y) => (
        <line key={y} x1={22} y1={y} x2={358} y2={y} stroke={C.line} strokeWidth={0.6} strokeDasharray="2 5" />
      ))}
      <rect x={280} y={100} width={78} height={96} fill={C.crit} opacity={0.08} />
      <line x1={22} y1={120} x2={358} y2={120} stroke={C.warn} strokeWidth={0.8} strokeDasharray="5 4" />
      <polyline points={pts.join(" ")} fill="none" stroke={C.trace} strokeWidth={1.4} />
      <StatusBar color={C.crit} text="14:32 INV-212 efficiency 3.8% below baseline — window ≤ 9 days" />
    </Scene>
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
    <Scene title="GridSense · Division 4 · 21,885 meters">
      <KpiRow
        items={[
          { label: "AT&C LOSS", value: "15.5%", color: C.warn },
          { label: "METERS ONLINE", value: "21,885", color: C.healthy },
          { label: "SUSPECTS", value: "7", color: C.crit },
        ]}
      />
      <Panel title="FEEDER INPUT vs BILLED (MWh, 30D)" />
      {feeders.map((f, i) => {
        const cx = 14 + i * 70 + 35;
        return (
          <g key={f.id}>
            <rect x={cx - 12} y={186 - f.input * 1.35} width={10} height={f.input * 1.35} rx={2} fill={C.trace} opacity={0.45} />
            <rect x={cx + 2} y={186 - f.billed * 1.35} width={10} height={f.billed * 1.35} rx={2} fill={f.color} opacity={0.9} />
            <text x={cx} y={198} fontSize={7} fill={C.dim} textAnchor="middle">
              {f.id}
            </text>
          </g>
        );
      })}
      <StatusBar color={C.crit} text="C-88412 · score 0.94 · −71% after meter swap · ~2,400 kWh/mo unbilled" />
    </Scene>
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
    <Scene title="SolarIQ · Pooling Station 3 · 5 MWp">
      <KpiRow
        items={[
          { label: "PLANT PR", value: "93.1%", color: C.warn },
          { label: "FAULT STRINGS", value: "6 / 180", color: C.crit },
          { label: "RECOVERABLE", value: "103 MWh/yr", color: C.warn },
        ]}
      />
      <Panel title="STRING PR — INVERTERS × STRINGS" />
      {rows.map((row, inv) => {
        const y = 101 + inv * 10;
        return (
          <g key={inv}>
            <text x={22} y={y + 7} fontSize={6} fill={C.faint}>
              INV-{String(inv + 1).padStart(2, "0")}
            </text>
            {row.map((color, s) => (
              <rect
                key={s}
                x={52 + s * 17}
                y={y}
                width={15}
                height={8}
                rx={1}
                fill={color}
                opacity={color === C.healthy ? 0.5 : 0.95}
              />
            ))}
          </g>
        );
      })}
      <StatusBar color={C.crit} text="INV-04 strings 7–10 — check CB-04-B fuses · +38 MWh/yr" />
    </Scene>
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
    <Scene title="WindIQ · Wind Farm 2 · 42 MW">
      <KpiRow
        items={[
          { label: "AVAILABILITY", value: "96.2%", color: C.healthy },
          { label: "FLAGGED", value: "2 / 8", color: C.crit },
          { label: "RECOVERABLE", value: "134 MWh/yr", color: C.warn },
        ]}
      />
      <Panel title="POWER CURVE CONFORMANCE" />
      {wtgs.map((w, i) => {
        const y = 103 + i * 12;
        return (
          <g key={w.id}>
            <text x={22} y={y + 5} fontSize={7} fill={C.text}>
              {w.id}
            </text>
            <rect x={62} y={y} width={264} height={5} rx={2.5} fill={C.bg} />
            <rect x={62} y={y} width={(w.v / 100) * 264} height={5} rx={2.5} fill={w.color} opacity={0.9} />
            <text x={358} y={y + 5} fontSize={7} fill={w.color} textAnchor="end">
              {w.v}%
            </text>
          </g>
        );
      })}
      <StatusBar color={C.crit} text="WTG-07 gearbox vib 3.1× baseline — ground · borescope in 48h" />
    </Scene>
  );
}

const SHOTS: Record<string, () => React.ReactNode> = {
  assetiq: AssetIQShot,
  gridsense: GridSenseShot,
  solariq: SolarIQShot,
  windiq: WindIQShot,
};

export function ConsoleScreenshot({ id }: { id: string }) {
  const Shot = SHOTS[id];
  return (
    <div className="overflow-hidden rounded-2xl border border-mk-border shadow-lg">
      <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface px-4 py-3">
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: "#ff5f57" }} />
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: "#febc2e" }} />
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: "#28c840" }} />
        <span className="ml-3 min-w-0 truncate rounded-md bg-mk-bg px-3 py-1 font-mono text-[10px] text-mk-ink-faint">
          app.zuttoo.io/{id}
        </span>
      </div>
      <Shot />
    </div>
  );
}
