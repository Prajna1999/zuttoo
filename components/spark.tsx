"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Spark({
  data,
  color,
}: {
  data: { temp: number }[];
  color: string;
}) {
  const gradId = `sg${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={34}>
      <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="temp"
          stroke={color}
          strokeWidth={1.4}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
