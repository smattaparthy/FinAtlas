"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

interface TaxProjectionChartProps {
  data: {
    year: number;
    age: number;
    totalTax: number;
    effectiveRate: number;
  }[];
}

export default function TaxProjectionChart({ data }: TaxProjectionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No data available
      </div>
    );
  }

  const maxTax = Math.max(...data.map((d) => d.totalTax));
  const maxRate = Math.max(...data.map((d) => d.effectiveRate));

  const width = 100;
  const height = 100;
  const padding = { top: 10, right: 5, bottom: 20, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Bar chart for total tax
  const barWidth = chartWidth / data.length;

  // Line chart for effective rate (overlay)
  const ratePath = data
    .map((d, i) => {
      const x = padding.left + (i + 0.5) * barWidth;
      const y =
        padding.top + chartHeight - (d.effectiveRate / maxRate) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Sample x-axis labels (show every 5 years or so)
  const xLabels = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-64 w-full"
      >
        {/* Tax bars */}
        {data.map((d, i) => {
          const x = padding.left + i * barWidth;
          const barHeight = (d.totalTax / maxTax) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth * 0.8}
              height={barHeight}
              fill="rgb(52 211 153 / 0.6)"
              stroke="rgb(52 211 153)"
              strokeWidth="0.1"
            />
          );
        })}

        {/* Effective rate line */}
        <path
          d={ratePath}
          fill="none"
          stroke="rgb(250 204 21)"
          strokeWidth="0.5"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="rgb(63 63 70)"
          strokeWidth="0.2"
        />

        {/* X-axis labels */}
        {xLabels.map((d, i) => {
          const xPos =
            padding.left + (data.indexOf(d) + 0.5) * barWidth;
          return (
            <text
              key={i}
              x={xPos}
              y={padding.top + chartHeight + 5}
              fill="rgb(161 161 170)"
              fontSize="3"
              textAnchor="middle"
            >
              Age {d.age}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-400/60"></div>
          <span className="text-zinc-400">Total Tax</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-yellow-400"></div>
          <span className="text-zinc-400">Effective Rate</span>
        </div>
      </div>
    </div>
  );
}
