// Hex values for contexts Tailwind classes can't reach: recharts props,
// computed/dynamic colors, inline SVG. Keep in sync with app/globals.css @theme.
export const COLORS = {
  bg: "#14181D",
  panel: "#1B2129",
  panelSoft: "#20262F",
  line: "#2C343F",
  text: "#DFE6EC",
  dim: "#8B98A5",
  faint: "#5A6672",
  healthy: "#3FD0C9",
  warn: "#F2B441",
  crit: "#F0605D",
  trace: "#6FA8DC",
  navBg: "#111519",
  navHover: "#1E252D",
} as const;

export const PRODUCTS = [
  { id: "assetiq", name: "AssetIQ", sub: "Predictive Maintenance", icon: "⚙" },
  { id: "gridsense", name: "GridSense", sub: "AMI Intelligence", icon: "⚡" },
  { id: "solariq", name: "SolarIQ", sub: "Solar Performance AI", icon: "☀" },
  { id: "windiq", name: "WindIQ", sub: "Wind Performance AI", icon: "💨" },
  { id: "fieldmate", name: "FieldMate", sub: "Field Copilot (AI)", icon: "🔧" },
] as const;

export const TOOLTIP_STYLE = {
  background: COLORS.panelSoft,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
