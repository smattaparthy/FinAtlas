"use client";

import { type SSClaimingScenario } from "@/lib/social-security/ssOptimization";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";

interface SSComparisonChartProps {
  scenarios: SSClaimingScenario[];
  optimalClaimAge: number;
  height?: number;
}

export default function SSComparisonChart({
  scenarios,
  optimalClaimAge,
  height = 300,
}: SSComparisonChartProps) {
  if (scenarios.length === 0) return null;

  const maxLifetime = Math.max(...scenarios.map((s) => s.lifetimeTotal));
  const minLifetime = Math.min(...scenarios.map((s) => s.lifetimeTotal));
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = 100 - ((padding.left + padding.right) / 800) * 100;
  const chartHeight = 100 - ((padding.top + padding.bottom) / height) * 100;

  // Y-axis ticks
  const yTicks = 5;
  const yStep = (maxLifetime - minLifetime) / (yTicks - 1);

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        {Array.from({ length: yTicks }).map((_, i) => {
          const y = padding.top + (i * chartHeight) / (yTicks - 1);
          return (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={100 - padding.right}
              y2={y}
              stroke="rgb(39, 39, 42)"
              strokeWidth={0.2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Bars */}
        {scenarios.map((scenario, index) => {
          const isOptimal = scenario.claimAge === optimalClaimAge;
          const barHeight =
            ((scenario.lifetimeTotal - minLifetime) / (maxLifetime - minLifetime)) *
            chartHeight;
          const barWidth = chartWidth / scenarios.length * 0.7;
          const x =
            padding.left + (index * chartWidth) / scenarios.length + barWidth * 0.2;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={scenario.claimAge}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={isOptimal ? "rgb(16, 185, 129)" : "rgb(82, 82, 91)"}
                opacity={isOptimal ? 1 : 0.6}
              />
            </g>
          );
        })}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
        {Array.from({ length: yTicks }).map((_, i) => {
          const value = maxLifetime - i * yStep;
          return (
            <div
              key={`y-label-${i}`}
              className="text-[10px] text-zinc-500 pr-2 -translate-y-2"
            >
              {formatCompactCurrency(value)}
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around px-12">
        {scenarios.map((scenario) => (
          <div
            key={scenario.claimAge}
            className={`text-xs ${
              scenario.claimAge === optimalClaimAge
                ? "text-emerald-400 font-semibold"
                : "text-zinc-500"
            }`}
          >
            {scenario.claimAge}
          </div>
        ))}
      </div>

      {/* Chart title */}
      <div className="absolute top-0 left-12 text-xs text-zinc-400">
        Lifetime Benefits by Claiming Age
      </div>

      {/* Optimal marker */}
      <div className="absolute top-6 right-8 flex items-center gap-2">
        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
        <span className="text-xs text-zinc-400">Optimal</span>
      </div>
    </div>
  );
}
