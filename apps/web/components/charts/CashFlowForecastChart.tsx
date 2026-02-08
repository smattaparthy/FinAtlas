"use client";

import { useMemo } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface CashFlowDataPoint {
  month: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
}

interface CashFlowForecastChartProps {
  data: CashFlowDataPoint[];
  height?: number;
}

export default function CashFlowForecastChart({
  data,
  height = 350,
}: CashFlowForecastChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Calculate the maximum value for scaling (inflows and outflows)
    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.inflows, Math.abs(d.outflows)))
    );
    const range = maxValue || 1;
    const padding = range * 0.1;
    const adjustedMax = maxValue + padding;

    const width = 100;
    const chartHeight = 100;
    const barWidth = width / data.length;
    const barGap = barWidth * 0.1;
    const actualBarWidth = (barWidth - barGap) * 0.4; // Each bar takes 40% of space
    const zeroLine = chartHeight / 2; // Zero line at middle

    // Generate bars and net cash flow line points
    const bars = data.map((point, i) => {
      const x = i * barWidth + barGap / 2;

      // Inflows bar (above zero line, green)
      const inflowHeight = (point.inflows / adjustedMax) * (chartHeight / 2);
      const inflowY = zeroLine - inflowHeight;

      // Outflows bar (below zero line, red, shown as positive for visual)
      const outflowHeight = (point.outflows / adjustedMax) * (chartHeight / 2);
      const outflowY = zeroLine;

      return {
        x,
        width: actualBarWidth,
        inflow: {
          height: inflowHeight,
          y: inflowY,
          value: point.inflows,
        },
        outflow: {
          height: outflowHeight,
          y: outflowY,
          value: point.outflows,
        },
        date: point.month,
      };
    });

    // Net cash flow line (sky-400 line)
    const netLinePoints = data.map((point, i) => {
      const x = i * barWidth + barWidth / 2;
      // Map net cash flow to chart position (can be positive or negative)
      const netRatio = point.netCashFlow / adjustedMax;
      const y = zeroLine - (netRatio * (chartHeight / 2));
      return { x, y, value: point.netCashFlow };
    });

    const netLinePath = netLinePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    // Y-axis ticks (show positive and negative range)
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const ratio = (tickCount - 1 - i) / (tickCount - 1); // 1 to 0
      const value = (ratio - 0.5) * 2 * adjustedMax; // -max to +max
      const y = i * (chartHeight / (tickCount - 1));
      return { value, y };
    });

    return { bars, netLinePath, netLinePoints, ticks, zeroLine };
  }, [data]);

  if (!chartData || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  const tooltipData = data.map((point) => ({
    date: point.month,
    values: [
      { label: "Inflows", value: point.inflows, color: "rgb(16, 185, 129)" },
      { label: "Outflows", value: point.outflows, color: "rgb(239, 68, 68)" },
      { label: "Net Cash Flow", value: point.netCashFlow, color: "rgb(56, 189, 248)" },
    ],
  }));

  return (
    <ChartTooltip data={tooltipData} leftOffset={80}>
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between text-xs text-zinc-500 py-2">
          {chartData.ticks.map((tick, i) => (
            <div key={i} className="text-right pr-2">
              {formatCompactCurrency(tick.value)}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute left-20 right-0 top-0 bottom-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Grid lines */}
            {chartData.ticks.map((tick, i) => (
              <line
                key={i}
                x1="0"
                y1={tick.y}
                x2="100"
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-zinc-800"
              />
            ))}

            {/* Zero line (horizontal at middle) */}
            <line
              x1="0"
              y1={chartData.zeroLine}
              x2="100"
              y2={chartData.zeroLine}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-zinc-600"
            />

            {/* Bars */}
            {chartData.bars.map((bar, i) => (
              <g key={i}>
                {/* Inflow bar (green, above zero) */}
                <rect
                  x={bar.x}
                  y={bar.inflow.y}
                  width={bar.width}
                  height={bar.inflow.height}
                  fill="rgb(16, 185, 129)"
                  opacity="0.8"
                />
                {/* Outflow bar (red, below zero) */}
                <rect
                  x={bar.x + bar.width * 1.5}
                  y={bar.outflow.y}
                  width={bar.width}
                  height={bar.outflow.height}
                  fill="rgb(239, 68, 68)"
                  opacity="0.8"
                />
              </g>
            ))}

            {/* Net cash flow line (sky-400) */}
            <path
              d={chartData.netLinePath}
              fill="none"
              stroke="rgb(56, 189, 248)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {/* Net cash flow points */}
            {chartData.netLinePoints.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill="rgb(56, 189, 248)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-20 right-0 bottom-4 flex justify-between text-xs text-zinc-500">
          {data
            .filter(
              (_, i) =>
                i === 0 ||
                i === data.length - 1 ||
                i === Math.floor(data.length / 3) ||
                i === Math.floor((data.length * 2) / 3)
            )
            .map((d, i) => (
              <div key={i}>{formatAxisDate(d.month)}</div>
            ))}
        </div>

        {/* Legend */}
        <div className="absolute left-20 bottom-0 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-zinc-400">Inflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-zinc-400">Outflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-sky-400"></div>
            <span className="text-zinc-400">Net Cash Flow</span>
          </div>
        </div>
      </div>
    </ChartTooltip>
  );
}
