export function KPICard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-panel px-3.5 py-3">
      <div className="text-[10px] font-semibold tracking-[0.08em] text-dim">
        {label}
      </div>
      <div
        className="mt-1 font-mono text-2xl font-semibold"
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-faint">{sub}</div>
    </div>
  );
}
