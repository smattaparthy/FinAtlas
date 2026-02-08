"use client";

import { useMemo } from "react";
import { formatCompactCurrency } from "@/lib/format";
import ChartTooltip from "../charts/ChartTooltip";
import type { CollegeProjectionPoint } from "@/lib/college/collegeSavingsCalculations";

interface CollegeSavingsChartProps {
  projectionPoints: CollegeProjectionPoint[];
  enrollmentAge: number;
  currentAge: number;
}

export default function CollegeSavingsChart({
  projectionPoints,
  enrollmentAge,
  currentAge,
}: CollegeSavingsChartProps) {
  const chartData = useMemo(() => {
    if (projectionPoints.length < 2) return null;

    const len = projectionPoints.length;
    const w = 100;
    const h = 100;

    // Y-axis range across both lines with padding
    const allValues = projectionPoints.flatMap((p) => [p.savings, p.costTarget]);
    const maxVal = Math.max(...allValues, 1);
    const minVal = 0;
    const padding = (maxVal - minVal) * 0.1;
    const adjustedMax = maxVal + padding;
    const range = adjustedMax - minVal;

    function toY(v: number) {
      return h - ((v - minVal) / range) * h;
    }
    function toX(i: number) {
      return (i / (len - 1)) * w;
    }

    // Savings line path (solid emerald)
    const savingsPath = projectionPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.savings)}`)
      .join(" ");

    // Cost target line path (dashed red) - only from enrollment onward
    const enrollIdx = enrollmentAge - currentAge;
    const costPoints = projectionPoints
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.i >= enrollIdx);

    const costPath =
      costPoints.length > 0
        ? costPoints
            .map(
              (p, j) =>
                `${j === 0 ? "M" : "L"} ${toX(p.i)} ${toY(p.costTarget)}`
            )
            .join(" ")
        : "";

    // Savings area fill
    const savingsAreaPath =
      savingsPath + ` L ${toX(len - 1)} ${h} L ${toX(0)} ${h} Z`;

    // Enrollment vertical line position
    const enrollX = toX(enrollIdx);

    // Determine gap/surplus at enrollment for shading
    const enrollPoint = projectionPoints[enrollIdx];
    let gapAreaPath = "";
    let gapType: "shortfall" | "surplus" | "none" = "none";

    if (enrollPoint) {
      const lastIdx = Math.min(enrollIdx + 4, len - 1);
      const savingsAtEnroll = enrollPoint.savings;
      const costAtEnd =
        projectionPoints[lastIdx]?.costTarget ?? 0;

      if (costAtEnd > savingsAtEnroll) {
        gapType = "shortfall";
      } else if (savingsAtEnroll > costAtEnd) {
        gapType = "surplus";
      }

      // Build a shaded region between savings and cost from enrollment to end of college
      if (gapType !== "none" && costPoints.length > 0) {
        const topLine = costPoints.map(
          (p, j) =>
            `${j === 0 ? "M" : "L"} ${toX(p.i)} ${toY(
              gapType === "shortfall" ? p.costTarget : p.savings
            )}`
        );
        const bottomLine = [...costPoints]
          .reverse()
          .map(
            (p) =>
              `L ${toX(p.i)} ${toY(
                gapType === "shortfall" ? p.savings : p.costTarget
              )}`
          );
        gapAreaPath = topLine.join(" ") + " " + bottomLine.join(" ") + " Z";
      }
    }

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMax - (i / (tickCount - 1)) * range;
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    return {
      savingsPath,
      costPath,
      savingsAreaPath,
      gapAreaPath,
      gapType,
      enrollX,
      enrollIdx,
      ticks,
      len,
      toX,
    };
  }, [projectionPoints, enrollmentAge, currentAge]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center text-zinc-500 h-[300px]">
        Not enough data to display chart
      </div>
    );
  }

  // Build tooltip data (using age as the "date" label)
  const tooltipData = projectionPoints.map((p) => ({
    date: `Age ${p.age}`,
    values: [
      {
        label: "Savings",
        value: p.savings,
        color: "rgb(34, 197, 94)",
      },
      ...(p.costTarget > 0
        ? [
            {
              label: "Cumulative Cost",
              value: p.costTarget,
              color: "rgb(239, 68, 68)",
            },
          ]
        : []),
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
                id="collegeSavingsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(34, 197, 94)"
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(34, 197, 94)"
                  stopOpacity="0.03"
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

            {/* Savings area fill */}
            <path
              d={chartData.savingsAreaPath}
              fill="url(#collegeSavingsGradient)"
            />

            {/* Gap/surplus shaded area */}
            {chartData.gapAreaPath && (
              <path
                d={chartData.gapAreaPath}
                fill={
                  chartData.gapType === "shortfall"
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(34, 197, 94, 0.15)"
                }
              />
            )}

            {/* Enrollment vertical dashed line */}
            <line
              x1={chartData.enrollX}
              y1="0"
              x2={chartData.enrollX}
              y2="100"
              stroke="rgb(161, 161, 170)"
              strokeWidth="1"
              strokeDasharray="3,3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Cost target line (dashed red) */}
            {chartData.costPath && (
              <path
                d={chartData.costPath}
                fill="none"
                stroke="rgb(239, 68, 68)"
                strokeWidth="2"
                strokeDasharray="4,3"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Savings line (solid emerald) */}
            <path
              d={chartData.savingsPath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* X-axis labels (ages) */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {[
            0,
            chartData.enrollIdx,
            projectionPoints.length - 1,
          ]
            .filter(
              (idx, i, arr) =>
                idx >= 0 &&
                idx < projectionPoints.length &&
                arr.indexOf(idx) === i
            )
            .map((idx) => (
              <div key={idx}>Age {projectionPoints[idx].age}</div>
            ))}
        </div>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 bg-emerald-500" />
            <span>Savings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 border-t-2 border-dashed border-red-500" />
            <span>Cost Target</span>
          </div>
        </div>

        {/* Enrollment label */}
        <div
          className="absolute top-2 text-xs text-zinc-400 pointer-events-none"
          style={{
            left: `calc(64px + ${
              (chartData.enrollIdx / (projectionPoints.length - 1)) * 100
            }% * (100% - 64px) / 100)`,
            transform: "translateX(-50%)",
          }}
        >
          Enrollment
        </div>
      </div>
    </ChartTooltip>
  );
}
