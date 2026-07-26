import { COLORS } from "@/lib/design-system";

export function HealthRing({
  value,
  color,
  size = 64,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={COLORS.line}
        strokeWidth="5"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeDasharray={`${(value / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={COLORS.text}
        fontFamily="var(--font-mono)"
        fontSize={size / 4.2}
        fontWeight="600"
      >
        {value}
      </text>
    </svg>
  );
}
