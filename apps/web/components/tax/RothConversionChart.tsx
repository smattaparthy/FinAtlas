"use client";

import { formatCurrency } from "@/lib/format";

interface RothConversionChartProps {
  data: {
    year: number;
    traditionalBalance: number;
    rothBalance: number;
  }[];
}

export default function RothConversionChart({
  data,
}: RothConversionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        No data available
      </div>
    );
  }

  const maxBalance = Math.max(
    ...data.map((d) => d.traditionalBalance + d.rothBalance)
  );

  const width = 100;
  const height = 100;
  const padding = { top: 10, right: 5, bottom: 20, left: 5 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate path for traditional balance (area)
  const traditionalPath = data
    .map((d, i) => {
      const x =
        padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        (d.traditionalBalance / maxBalance) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  const traditionalAreaPath =
    traditionalPath +
    ` L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Generate path for roth balance (area on top)
  const rothPath = data
    .map((d, i) => {
      const x =
        padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const totalBalance = d.traditionalBalance + d.rothBalance;
      const y =
        padding.top + chartHeight - (totalBalance / maxBalance) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Bottom of Roth area follows top of Traditional area
  const rothBottomPath = data
    .slice()
    .reverse()
    .map((d, i) => {
      const x =
        padding.left +
        ((data.length - 1 - i) / (data.length - 1 || 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        (d.traditionalBalance / maxBalance) * chartHeight;
      return `L ${x} ${y}`;
    })
    .join(" ");

  const rothAreaPath = rothPath + rothBottomPath + " Z";

  // X-axis labels
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-64 w-full"
      >
        {/* Traditional IRA area (bottom) */}
        <path
          d={traditionalAreaPath}
          fill="rgb(239 68 68 / 0.3)"
          stroke="rgb(239 68 68)"
          strokeWidth="0.3"
        />

        {/* Roth IRA area (top) */}
        <path
          d={rothAreaPath}
          fill="rgb(52 211 153 / 0.3)"
          stroke="rgb(52 211 153)"
          strokeWidth="0.3"
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
          const x =
            padding.left +
            (data.indexOf(d) / (data.length - 1 || 1)) * chartWidth;
          return (
            <text
              key={i}
              x={x}
              y={padding.top + chartHeight + 5}
              fill="rgb(161 161 170)"
              fontSize="3"
              textAnchor="middle"
            >
              {d.year}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500/50"></div>
          <span className="text-zinc-400">Traditional IRA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-400/50"></div>
          <span className="text-zinc-400">Roth IRA</span>
        </div>
      </div>

      {/* Key milestones */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-zinc-400">Starting Balance</div>
          <div className="text-sm font-medium text-zinc-50">
            {formatCurrency(data[0].traditionalBalance)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Final Traditional</div>
          <div className="text-sm font-medium text-red-400">
            {formatCurrency(data[data.length - 1].traditionalBalance)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Final Roth</div>
          <div className="text-sm font-medium text-emerald-400">
            {formatCurrency(data[data.length - 1].rothBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}
