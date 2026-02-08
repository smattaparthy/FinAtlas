"use client";

import { useMemo } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface SnapshotPoint {
  date: string;
  netWorth: number;
}

interface ProjectedPoint {
  t: string;
  v: number;
}

interface NetWorthHistoryChartProps {
  snapshots: SnapshotPoint[];
  projected: ProjectedPoint[];
  height?: number;
}

export default function NetWorthHistoryChart({
  snapshots,
  projected,
  height = 200,
}: NetWorthHistoryChartProps) {
  const chartData = useMemo(() => {
    if (projected.length < 2 && snapshots.length < 2) return null;

    // Build unified value range from both datasets
    const allValues: number[] = [
      ...projected.map((p) => p.v),
      ...snapshots.map((s) => s.netWorth),
    ];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Use projected series time range as the reference
    const projectedStart = projected.length > 0 ? new Date(projected[0].t).getTime() : 0;
    const projectedEnd =
      projected.length > 0 ? new Date(projected[projected.length - 1].t).getTime() : 0;
    const timeRange = projectedEnd - projectedStart || 1;

    // Map projected points
    const projectedPoints = projected.map((d) => {
      const x = ((new Date(d.t).getTime() - projectedStart) / timeRange) * width;
      const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.v, date: d.t };
    });

    const projectedLinePath = projectedPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const projectedAreaPath = `${projectedLinePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

    // Map snapshot points onto the same time axis
    const snapshotPoints = snapshots
      .map((s) => {
        const t = new Date(s.date).getTime();
        const x = ((t - projectedStart) / timeRange) * width;
        const y = chartHeight - ((s.netWorth - adjustedMin) / adjustedRange) * chartHeight;
        return { x, y, value: s.netWorth, date: s.date };
      })
      .filter((p) => p.x >= 0 && p.x <= width)
      .sort((a, b) => a.x - b.x);

    const snapshotLinePath =
      snapshotPoints.length > 1
        ? snapshotPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
        : null;

    // Y-axis ticks
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    // X-axis labels from projected series
    const xLabels: { date: string; position: "start" | "middle" | "end" }[] = [];
    if (projected.length > 0) {
      xLabels.push({ date: projected[0].t, position: "start" });
      if (projected.length > 2) {
        xLabels.push({
          date: projected[Math.floor(projected.length / 2)].t,
          position: "middle",
        });
      }
      if (projected.length > 1) {
        xLabels.push({
          date: projected[projected.length - 1].t,
          position: "end",
        });
      }
    }

    // Build tooltip data by merging both datasets at each projected point
    const tooltipData = projected.map((d) => {
      const values: { label: string; value: number; color: string }[] = [
        { label: "Projected", value: d.v, color: "rgb(34, 197, 94)" },
      ];

      // Find closest snapshot within reasonable proximity
      if (snapshots.length > 0) {
        const projTime = new Date(d.t).getTime();
        let closest: SnapshotPoint | null = null;
        let closestDist = Infinity;
        for (const s of snapshots) {
          const dist = Math.abs(new Date(s.date).getTime() - projTime);
          if (dist < closestDist) {
            closestDist = dist;
            closest = s;
          }
        }
        // Only include if within ~15 days
        if (closest && closestDist < 15 * 24 * 60 * 60 * 1000) {
          values.push({
            label: "Actual",
            value: closest.netWorth,
            color: "rgb(56, 189, 248)",
          });
        }
      }

      return { date: d.t, values };
    });

    return {
      projectedPoints,
      projectedLinePath,
      projectedAreaPath,
      snapshotPoints,
      snapshotLinePath,
      ticks,
      xLabels,
      tooltipData,
    };
  }, [snapshots, projected]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Not enough data to display chart
      </div>
    );
  }

  return (
    <ChartTooltip data={chartData.tooltipData} leftOffset={64}>
      <div className="relative" style={{ height }}>
        {/* Legend */}
        <div className="absolute -top-8 left-16 flex items-center gap-5 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-emerald-500" />
            <span>Projected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="24" height="2" className="text-sky-400">
              <line
                x1="0"
                y1="1"
                x2="24"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4,3"
              />
            </svg>
            <span>Actual</span>
          </div>
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-zinc-500 py-2">
          {chartData.ticks.map((tick, i) => (
            <div key={i} className="text-right pr-2">
              {formatCompactCurrency(tick.value)}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute left-16 right-0 top-0 bottom-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
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

            {/* Projected area fill with gradient */}
            <defs>
              <linearGradient id="nwHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={chartData.projectedAreaPath} fill="url(#nwHistoryGradient)" />

            {/* Projected line */}
            <path
              d={chartData.projectedLinePath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Actual snapshot dashed line */}
            {chartData.snapshotLinePath && (
              <path
                d={chartData.snapshotLinePath}
                fill="none"
                stroke="rgb(56, 189, 248)"
                strokeWidth="2"
                strokeDasharray="4,3"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Actual snapshot dots */}
            {chartData.snapshotPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1.5"
                fill="rgb(56, 189, 248)"
                stroke="rgb(var(--zinc-950))"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {chartData.xLabels.map((label, i) => (
            <div key={i}>{formatAxisDate(label.date)}</div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
}
