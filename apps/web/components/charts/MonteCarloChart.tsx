"use client";

import { useMemo } from "react";
import type { PercentileBands } from "@finatlas/engine/src/internal/montecarlo";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface MonteCarloChartProps {
  bands: PercentileBands[];
  height?: number;
}

export default function MonteCarloChart({ bands, height = 300 }: MonteCarloChartProps) {
  const chartData = useMemo(() => {
    if (!bands || bands.length < 2) return null;

    // Find min/max across all percentiles
    let minValue = Infinity;
    let maxValue = -Infinity;
    for (const b of bands) {
      if (b.p10 < minValue) minValue = b.p10;
      if (b.p90 > maxValue) maxValue = b.p90;
    }
    minValue = Math.min(minValue, 0);

    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const w = 100;
    const h = 100;

    function toY(v: number) {
      return h - ((v - adjustedMin) / adjustedRange) * h;
    }
    function toX(i: number) {
      return (i / (bands.length - 1)) * w;
    }

    // Build paths for each band pair
    // P10-P90 outer band
    const p10Points = bands.map((b, i) => `${toX(i)},${toY(b.p10)}`);
    const p90Points = bands.map((b, i) => `${toX(i)},${toY(b.p90)}`);
    const outerBandPath = `M ${p90Points.join(" L ")} L ${p10Points.reverse().join(" L ")} Z`;

    // P25-P75 inner band
    const p25Points = bands.map((b, i) => `${toX(i)},${toY(b.p25)}`);
    const p75Points = bands.map((b, i) => `${toX(i)},${toY(b.p75)}`);
    const innerBandPath = `M ${p75Points.join(" L ")} L ${p25Points.reverse().join(" L ")} Z`;

    // P50 median line
    const medianPath = bands
      .map((b, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(b.p50)}`)
      .join(" ");

    // Y-axis ticks
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    return { outerBandPath, innerBandPath, medianPath, ticks, adjustedMin, adjustedMax };
  }, [bands]);

  if (!chartData || bands.length < 2) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Not enough data to display chart
      </div>
    );
  }

  const tooltipData = bands.map((b) => ({
    date: b.t,
    values: [
      { label: "P90 (Best)", value: b.p90, color: "rgba(34, 197, 94, 0.4)" },
      { label: "P75", value: b.p75, color: "rgba(34, 197, 94, 0.6)" },
      { label: "Median", value: b.p50, color: "rgb(34, 197, 94)" },
      { label: "P25", value: b.p25, color: "rgba(34, 197, 94, 0.6)" },
      { label: "P10 (Worst)", value: b.p10, color: "rgba(34, 197, 94, 0.4)" },
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

            {/* P10-P90 outer band */}
            <path d={chartData.outerBandPath} fill="rgb(34, 197, 94)" opacity="0.08" />

            {/* P25-P75 inner band */}
            <path d={chartData.innerBandPath} fill="rgb(34, 197, 94)" opacity="0.15" />

            {/* P50 median line */}
            <path
              d={chartData.medianPath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {bands
            .filter(
              (_, i) =>
                i === 0 ||
                i === bands.length - 1 ||
                (bands.length > 5 && i === Math.floor(bands.length / 2))
            )
            .map((b, i) => (
              <div key={i}>{formatAxisDate(b.t)}</div>
            ))}
        </div>
      </div>
    </ChartTooltip>
  );
}
