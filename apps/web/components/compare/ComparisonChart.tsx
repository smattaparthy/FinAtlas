"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { SCENARIO_COLORS } from "./ScenarioComparisonPicker";

interface ScenarioData {
  name: string;
  series: SeriesPoint[];
}

interface ComparisonChartProps {
  scenarios: ScenarioData[];
  height?: number;
}

export default function ComparisonChart({ scenarios, height = 400 }: ComparisonChartProps) {
  const chartData = useMemo(() => {
    if (scenarios.length === 0) return null;

    // Find global min/max across all scenarios
    const allValues = scenarios.flatMap((s) => s.series.map((d) => d.v));
    if (allValues.length === 0) return null;

    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Generate paths for each scenario
    const scenarioPaths = scenarios.map((scenario, idx) => {
      const points = scenario.series.map((d, i) => {
        const x = (i / Math.max(scenario.series.length - 1, 1)) * width;
        const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
        return { x, y, value: d.v, date: d.t };
      });

      const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      const areaPath = `${linePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;
      const color = SCENARIO_COLORS[idx];

      return { name: scenario.name, points, linePath, areaPath, color, finalValue: points[points.length - 1]?.value ?? 0 };
    });

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    return { scenarioPaths, ticks };
  }, [scenarios]);

  if (!chartData || scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Select scenarios above to compare
      </div>
    );
  }

  // Build tooltip data from the longest series
  const longestSeries = scenarios.reduce((a, b) => (a.series.length >= b.series.length ? a : b));
  const tooltipData = longestSeries.series.map((d, i) => ({
    date: d.t,
    values: scenarios.map((s, sIdx) => ({
      label: s.name,
      value: s.series[i]?.v ?? 0,
      color: SCENARIO_COLORS[sIdx],
    })),
  }));

  return (
    <div>
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
          <div className="absolute left-20 right-0 top-0 bottom-6">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              {/* Grid lines */}
              {chartData.ticks.map((tick, i) => (
                <line key={i} x1="0" y1={tick.y} x2="100" y2={tick.y} stroke="currentColor" strokeWidth="0.3" className="text-zinc-800" />
              ))}

              {/* Gradients */}
              <defs>
                {chartData.scenarioPaths.map((sp, idx) => (
                  <linearGradient key={idx} id={`compareGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sp.color} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={sp.color} stopOpacity="0.02" />
                  </linearGradient>
                ))}
              </defs>

              {/* Area fills */}
              {chartData.scenarioPaths.map((sp, idx) => (
                <path key={`area-${idx}`} d={sp.areaPath} fill={`url(#compareGradient${idx})`} />
              ))}

              {/* Lines */}
              {chartData.scenarioPaths.map((sp, idx) => (
                <path key={`line-${idx}`} d={sp.linePath} fill="none" stroke={sp.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="absolute left-20 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
            {longestSeries.series
              .filter((_, i) => i === 0 || i === longestSeries.series.length - 1 || i === Math.floor(longestSeries.series.length / 2))
              .map((d, i) => (
                <div key={i}>{formatAxisDate(d.t)}</div>
              ))}
          </div>
        </div>
      </ChartTooltip>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {chartData.scenarioPaths.map((sp, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sp.color }} />
            <span className="text-zinc-300">{sp.name}</span>
            <span className="text-zinc-500">({formatCompactCurrency(sp.finalValue)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
