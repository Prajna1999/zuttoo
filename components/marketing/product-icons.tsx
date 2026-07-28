// Line icons + accent hue per product, used only on the marketing pages.
// Hues render on light and dark via color-mix tints, so one value suffices.
export const PRODUCT_HUES: Record<string, string> = {
  assetiq: "#0d9488",
  gridsense: "#d97706",
  solariq: "#ea580c",
  windiq: "#0284c7",
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden>
      <path d="M4.5 15.5a8 8 0 1 1 15 0" />
      <path d="M12 15.5 16 10" />
      <path d="M5.5 19h13" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden>
      <path d="M13 2.5 6 13.5h5L9.5 21.5 18 9.5h-5.5L15.5 2.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function TurbineIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden>
      <circle cx="12" cy="9" r="1.4" />
      <path d="M12 7.6V2.5M13.2 9.7l4.4 2.6M10.8 9.7 6.4 12.3M12 10.4V21M9 21h6" />
    </svg>
  );
}

export const PRODUCT_ICONS: Record<string, () => React.ReactNode> = {
  assetiq: GaugeIcon,
  gridsense: BoltIcon,
  solariq: SunIcon,
  windiq: TurbineIcon,
};

export function ProductIconTile({ id, size = 40 }: { id: string; size?: number }) {
  const hue = PRODUCT_HUES[id];
  const Icon = PRODUCT_ICONS[id];
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl"
      style={{
        width: size,
        height: size,
        color: hue,
        background: `color-mix(in srgb, ${hue} 11%, transparent)`,
      }}
    >
      <Icon />
    </span>
  );
}
