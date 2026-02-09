"use client";

import { useMemo } from "react";
import { formatCompactCurrency } from "@/lib/format";
import ChartTooltip from "../charts/ChartTooltip";
import type { HealthcareProjection } from "@/lib/healthcare/healthcareCostCalculations";

interface HealthcareCostChartProps {
  projections: HealthcareProjection[];
}

export default function HealthcareCostChart({ projections }: HealthcareCostChartProps) {
  const chartData = useMemo(() => {
    if (projections.length < 2) return null;

    const len = projections.length;
    const w = 100;
    const h = 100;

    // Find phase boundaries
    const retirementIdx = projections.findIndex(p => p.phase !== 'PRE_RETIREMENT');
    const medicareIdx = projections.findIndex(p => p.phase === 'MEDICARE');

    // Y-axis range
    const maxCost = Math.max(...projections.map(p => p.totalCost), 1);
    const maxHSA = Math.max(...projections.map(p => p.hsaBalance), 1);
    const maxVal = Math.max(maxCost, maxHSA);
    const padding = maxVal * 0.1;
    const adjustedMax = maxVal + padding;
    const range = adjustedMax;

    function toY(v: number) {
      return h - (v / range) * h;
    }
    function toX(i: number) {
      return (i / (len - 1)) * w;
    }

    // Stacked area paths
    const premiumPoints = projections.map((p, i) => ({
      x: toX(i),
      y: toY(p.premium),
    }));

    const outOfPocketPoints = projections.map((p, i) => ({
      x: toX(i),
      y: toY(p.premium + p.outOfPocket),
    }));

    // Premium area (bottom)
    const premiumAreaPath = [
      `M ${premiumPoints[0].x} ${h}`,
      ...premiumPoints.map(p => `L ${p.x} ${p.y}`),
      `L ${premiumPoints[len - 1].x} ${h}`,
      'Z',
    ].join(' ');

    // Out-of-pocket area (top)
    const outOfPocketAreaPath = [
      `M ${premiumPoints[0].x} ${premiumPoints[0].y}`,
      ...outOfPocketPoints.map(p => `L ${p.x} ${p.y}`),
      ...premiumPoints.reverse().map(p => `L ${p.x} ${p.y}`),
      'Z',
    ].join(' ');

    // HSA balance line
    const hsaLinePath = projections
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.hsaBalance)}`)
      .join(' ');

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMax - (i / (tickCount - 1)) * range;
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    return {
      premiumAreaPath,
      outOfPocketAreaPath,
      hsaLinePath,
      retirementIdx,
      medicareIdx,
      ticks,
      len,
      toX,
    };
  }, [projections]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center text-zinc-500 h-[350px]">
        Not enough data to display chart
      </div>
    );
  }

  // Build tooltip data
  const tooltipData = projections.map((p) => ({
    date: `Age ${p.age}`,
    values: [
      {
        label: 'Premium',
        value: p.premium,
        color: 'rgb(34, 197, 94)',
      },
      {
        label: 'Out-of-Pocket',
        value: p.outOfPocket,
        color: 'rgb(59, 130, 246)',
      },
      {
        label: 'HSA Balance',
        value: p.hsaBalance,
        color: 'rgb(168, 85, 247)',
      },
    ],
  }));

  return (
    <ChartTooltip
      data={tooltipData}
      leftOffset={64}
      formatValue={formatCompactCurrency}
    >
      <div className="relative" style={{ height: 350 }}>
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
              <linearGradient
                id="premiumGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(34, 197, 94)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(34, 197, 94)"
                  stopOpacity="0.1"
                />
              </linearGradient>
              <linearGradient
                id="outOfPocketGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(59, 130, 246)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(59, 130, 246)"
                  stopOpacity="0.1"
                />
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

            {/* Phase boundary lines */}
            {chartData.retirementIdx > 0 && (
              <line
                x1={chartData.toX(chartData.retirementIdx)}
                y1="0"
                x2={chartData.toX(chartData.retirementIdx)}
                y2="100"
                stroke="rgb(161, 161, 170)"
                strokeWidth="1"
                strokeDasharray="3,3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {chartData.medicareIdx > 0 && (
              <line
                x1={chartData.toX(chartData.medicareIdx)}
                y1="0"
                x2={chartData.toX(chartData.medicareIdx)}
                y2="100"
                stroke="rgb(161, 161, 170)"
                strokeWidth="1"
                strokeDasharray="3,3"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Stacked areas */}
            <path
              d={chartData.premiumAreaPath}
              fill="url(#premiumGradient)"
            />
            <path
              d={chartData.outOfPocketAreaPath}
              fill="url(#outOfPocketGradient)"
            />

            {/* HSA balance line */}
            <path
              d={chartData.hsaLinePath}
              fill="none"
              stroke="rgb(168, 85, 247)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {[0, chartData.retirementIdx, chartData.medicareIdx, projections.length - 1]
            .filter((idx, i, arr) => idx >= 0 && idx < projections.length && arr.indexOf(idx) === i)
            .map((idx) => (
              <div key={idx}>Age {projections[idx].age}</div>
            ))}
        </div>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-emerald-500/40" />
            <span>Premium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-blue-500/40" />
            <span>Out-of-Pocket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-purple-500" />
            <span>HSA Balance</span>
          </div>
        </div>

        {/* Phase labels */}
        {chartData.retirementIdx > 0 && (
          <div
            className="absolute top-8 text-xs text-zinc-400 pointer-events-none"
            style={{
              left: `calc(64px + ${
                (chartData.retirementIdx / (projections.length - 1)) * 100
              }% * (100% - 64px) / 100)`,
              transform: 'translateX(-50%)',
            }}
          >
            Retirement
          </div>
        )}
        {chartData.medicareIdx > 0 && (
          <div
            className="absolute top-8 text-xs text-zinc-400 pointer-events-none"
            style={{
              left: `calc(64px + ${
                (chartData.medicareIdx / (projections.length - 1)) * 100
              }% * (100% - 64px) / 100)`,
              transform: 'translateX(-50%)',
            }}
          >
            Medicare
          </div>
        )}
      </div>
    </ChartTooltip>
  );
}
