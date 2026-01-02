"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";

interface AssetsLiabilitiesChartProps {
  assetsSeries: SeriesPoint[];
  liabilitiesSeries: SeriesPoint[];
  height?: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

export default function AssetsLiabilitiesChart({
  assetsSeries,
  liabilitiesSeries,
  height = 300,
}: AssetsLiabilitiesChartProps) {
  const chartData = useMemo(() => {
    if (assetsSeries.length === 0 || liabilitiesSeries.length === 0) return null;

    const allValues = [...assetsSeries.map((d) => d.v), ...liabilitiesSeries.map((d) => d.v)];
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Generate asset points
    const assetPoints = assetsSeries.map((d, i) => {
      const x = (i / (assetsSeries.length - 1)) * width;
      const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.v };
    });

    // Generate liability points
    const liabilityPoints = liabilitiesSeries.map((d, i) => {
      const x = (i / (liabilitiesSeries.length - 1)) * width;
      const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.v };
    });

    // Create SVG paths
    const assetsLinePath = assetPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const assetsAreaPath = `${assetsLinePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

    const liabilitiesLinePath = liabilityPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const liabilitiesAreaPath = `${liabilitiesLinePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    return {
      assetPoints,
      liabilityPoints,
      assetsLinePath,
      assetsAreaPath,
      liabilitiesLinePath,
      liabilitiesAreaPath,
      ticks,
    };
  }, [assetsSeries, liabilitiesSeries]);

  if (!chartData || assetsSeries.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between text-xs text-zinc-500 py-2">
        {chartData.ticks.map((tick, i) => (
          <div key={i} className="text-right pr-2">
            {formatCurrency(tick.value)}
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

          {/* Liabilities area (red) */}
          <defs>
            <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={chartData.liabilitiesAreaPath} fill="url(#liabilitiesGradient)" />
          <path
            d={chartData.liabilitiesLinePath}
            fill="none"
            stroke="rgb(239, 68, 68)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Assets area (green) */}
          <defs>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={chartData.assetsAreaPath} fill="url(#assetsGradient)" />
          <path
            d={chartData.assetsLinePath}
            fill="none"
            stroke="rgb(34, 197, 94)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-20 right-0 bottom-4 flex justify-between text-xs text-zinc-500">
        {assetsSeries.filter((_, i) => i === 0 || i === assetsSeries.length - 1 || i === Math.floor(assetsSeries.length / 4) || i === Math.floor(assetsSeries.length * 3 / 4)).map((d, i) => (
          <div key={i}>{new Date(d.t).getFullYear()}-{String(new Date(d.t).getMonth() + 1).padStart(2, '0')}</div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute left-20 bottom-0 flex gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-zinc-400">Assets</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-zinc-400">Liabilities</span>
        </div>
      </div>
    </div>
  );
}
