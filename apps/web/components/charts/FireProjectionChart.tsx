"use client";

import { useMemo } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface FireProjectionChartProps {
  projection: Array<{ date: string; netWorth: number; fiNumber: number }>;
  height?: number;
}

export default function FireProjectionChart({
  projection,
  height = 300,
}: FireProjectionChartProps) {
  const chartData = useMemo(() => {
    if (projection.length < 2) return null;

    const len = projection.length;

    // Unified Y-axis range with 10% padding above max
    const allValues = projection.flatMap((p) => [p.netWorth, p.fiNumber]);
    const maxVal = Math.max(...allValues, 1);
    const minVal = Math.min(...allValues.filter((v) => v >= 0), 0);
    const padding = (maxVal - minVal) * 0.1;
    const adjustedMax = maxVal + padding;
    const adjustedMin = Math.max(minVal - padding * 0.5, 0);
    const range = adjustedMax - adjustedMin;

    const w = 100;
    const h = 100;

    function toY(v: number) {
      return h - ((v - adjustedMin) / range) * h;
    }
    function toX(i: number) {
      return (i / (len - 1)) * w;
    }

    // Build paths
    const nwPath = projection
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.netWorth)}`)
      .join(" ");

    const fiPath = projection
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.fiNumber)}`)
      .join(" ");

    // Area fill path for net worth (close to bottom)
    const nwAreaPath =
      nwPath +
      ` L ${toX(len - 1)} ${h} L ${toX(0)} ${h} Z`;

    // Find crossover point (net worth crosses above FI number)
    let crossoverIdx = -1;
    for (let i = 1; i < len; i++) {
      if (
        projection[i - 1].netWorth < projection[i - 1].fiNumber &&
        projection[i].netWorth >= projection[i].fiNumber
      ) {
        crossoverIdx = i;
        break;
      }
    }

    let crossoverX = 0;
    let crossoverY = 0;
    if (crossoverIdx > 0) {
      // Interpolate for more accurate crossover position
      const prev = projection[crossoverIdx - 1];
      const curr = projection[crossoverIdx];
      const nwDelta = curr.netWorth - prev.netWorth;
      const fiDelta = curr.fiNumber - prev.fiNumber;
      const gap = prev.fiNumber - prev.netWorth;
      const closingRate = nwDelta - fiDelta;
      const fraction = closingRate > 0 ? gap / closingRate : 0.5;
      const interpolatedValue =
        prev.netWorth + nwDelta * Math.min(Math.max(fraction, 0), 1);

      crossoverX = toX(crossoverIdx - 1) + (toX(crossoverIdx) - toX(crossoverIdx - 1)) * fraction;
      crossoverY = toY(interpolatedValue);
    }

    // Y-axis ticks (4 ticks)
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMax - (i / (tickCount - 1)) * range;
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    return {
      nwPath,
      fiPath,
      nwAreaPath,
      ticks,
      len,
      toX,
      crossoverIdx,
      crossoverX,
      crossoverY,
    };
  }, [projection]);

  if (!chartData) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  // Build tooltip data
  const tooltipData = projection.map((p) => ({
    date: p.date,
    values: [
      { label: "Net Worth", value: p.netWorth, color: "rgb(34, 197, 94)" },
      { label: "FI Number", value: p.fiNumber, color: "rgb(251, 191, 36)" },
    ],
  }));

  return (
    <ChartTooltip data={tooltipData} leftOffset={64}>
      <div className="relative" style={{ height }}>
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
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="fireNwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

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

            {/* Net Worth area fill */}
            <path
              d={chartData.nwAreaPath}
              fill="url(#fireNwGradient)"
            />

            {/* FI Number line (dashed, amber) */}
            <path
              d={chartData.fiPath}
              fill="none"
              stroke="rgb(251, 191, 36)"
              strokeWidth="2"
              strokeDasharray="4,3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Net Worth line (solid, emerald) */}
            <path
              d={chartData.nwPath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Crossover diamond marker */}
            {chartData.crossoverIdx > 0 && (
              <polygon
                points={`${chartData.crossoverX},${chartData.crossoverY - 4} ${chartData.crossoverX + 3},${chartData.crossoverY} ${chartData.crossoverX},${chartData.crossoverY + 4} ${chartData.crossoverX - 3},${chartData.crossoverY}`}
                fill="rgb(34,197,94)"
                stroke="rgb(var(--zinc-950))"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {[0, Math.floor((projection.length - 1) / 2), projection.length - 1]
            .filter((i) => i < projection.length)
            .map((idx) => (
              <div key={idx}>{formatAxisDate(projection[idx].date)}</div>
            ))}
        </div>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-emerald-500" />
            <span>Net Worth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span>FI Number</span>
          </div>
        </div>
      </div>
    </ChartTooltip>
  );
}
