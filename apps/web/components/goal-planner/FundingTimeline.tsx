"use client";

import { useMemo } from "react";
import { formatCompactCurrency } from "@/lib/format";
import ChartTooltip from "../charts/ChartTooltip";

interface GoalTimelineData {
  name: string;
  targetAmount: number;
  monthsRemaining: number | null;
  allocatedSavings: number;
  requiredMonthly: number | null;
  type: string;
}

interface FundingTimelineProps {
  goals: GoalTimelineData[];
  monthlySavingsAvailable: number;
  height?: number;
}

const TYPE_COLORS: Record<string, string> = {
  RETIREMENT: "rgb(16, 185, 129)",
  EDUCATION: "rgb(59, 130, 246)",
  MAJOR_PURCHASE: "rgb(245, 158, 11)",
  EMERGENCY_FUND: "rgb(139, 92, 246)",
  CUSTOM: "rgb(161, 161, 170)",
};

export default function FundingTimeline({
  goals,
  monthlySavingsAvailable,
  height = 350,
}: FundingTimelineProps) {
  const timelineGoals = useMemo(
    () =>
      goals.filter(
        (g) =>
          g.monthsRemaining !== null &&
          g.monthsRemaining > 0 &&
          g.requiredMonthly !== null
      ),
    [goals]
  );

  const chartData = useMemo(() => {
    if (timelineGoals.length === 0) return null;

    const maxMonths = Math.min(
      Math.max(...timelineGoals.map((g) => g.monthsRemaining as number)),
      360
    );
    const maxTarget = Math.max(...timelineGoals.map((g) => g.targetAmount));
    const padding = maxTarget * 0.1;
    const adjustedMax = maxTarget + padding;

    if (maxMonths < 1 || adjustedMax <= 0) return null;

    const w = 100;
    const h = 100;

    function toX(month: number) {
      return (month / maxMonths) * w;
    }
    function toY(value: number) {
      return h - (value / adjustedMax) * h;
    }

    // Build growth curves for each goal
    const curves = timelineGoals.map((goal) => {
      const months = goal.monthsRemaining as number;
      const monthly = goal.requiredMonthly ?? 0;
      const r = 0.005; // 0.5% monthly growth

      // Generate points along the growth curve
      const stepCount = Math.min(months, 120); // Cap at 120 sample points
      const step = months / stepCount;
      const points: { x: number; y: number; month: number; value: number }[] =
        [];

      for (let i = 0; i <= stepCount; i++) {
        const m = Math.round(i * step);
        // FV of initial savings + FV of monthly contributions
        let balance =
          goal.allocatedSavings * Math.pow(1 + r, m) +
          (monthly > 0 && r > 0
            ? monthly * ((Math.pow(1 + r, m) - 1) / r)
            : monthly * m);
        balance = Math.min(balance, goal.targetAmount * 1.05);
        points.push({ x: toX(m), y: toY(balance), month: m, value: balance });
      }

      const pathD = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

      const color = TYPE_COLORS[goal.type] ?? TYPE_COLORS.CUSTOM;

      return {
        goal,
        points,
        pathD,
        color,
        targetY: toY(goal.targetAmount),
        targetEndX: toX(Math.min(months, maxMonths)),
      };
    });

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = (adjustedMax * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    // X-axis labels in years
    const yearLabels: { month: number; label: string }[] = [];
    const yearStep = maxMonths <= 60 ? 12 : maxMonths <= 120 ? 24 : 60;
    for (let m = 0; m <= maxMonths; m += yearStep) {
      yearLabels.push({
        month: m,
        label: m === 0 ? "Now" : `${Math.round(m / 12)}y`,
      });
    }

    return { curves, ticks, yearLabels, maxMonths };
  }, [timelineGoals]);

  if (!chartData || timelineGoals.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500 text-sm"
        style={{ height }}
      >
        Set target dates on your goals to see the funding timeline
      </div>
    );
  }

  // Build tooltip data: one entry per sampled month across all curves
  const sampleCount = 50;
  const monthStep = chartData.maxMonths / sampleCount;
  const tooltipData = Array.from({ length: sampleCount + 1 }, (_, i) => {
    const month = Math.round(i * monthStep);
    const now = new Date();
    const dateAtMonth = new Date(
      now.getFullYear(),
      now.getMonth() + month,
      1
    );
    const dateStr = dateAtMonth.toISOString().slice(0, 7);

    const values = chartData.curves.map((curve) => {
      // Find closest point
      const closestPoint = curve.points.reduce((best, p) =>
        Math.abs(p.month - month) < Math.abs(best.month - month) ? p : best
      );
      return {
        label: curve.goal.name,
        value: closestPoint.value,
        color: curve.color,
      };
    });

    return { date: dateStr, values };
  });

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

            {/* Target amount dashed lines */}
            {chartData.curves.map((curve, i) => (
              <line
                key={`target-${i}`}
                x1="0"
                y1={curve.targetY}
                x2={curve.targetEndX}
                y2={curve.targetY}
                stroke="rgb(251, 191, 36)"
                strokeWidth="1"
                strokeDasharray="3,2"
                vectorEffect="non-scaling-stroke"
                opacity="0.6"
              />
            ))}

            {/* Growth curves */}
            {chartData.curves.map((curve, i) => (
              <path
                key={`curve-${i}`}
                d={curve.pathD}
                fill="none"
                stroke={curve.color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-20 right-0 bottom-4 flex justify-between text-xs text-zinc-500">
          {chartData.yearLabels.map((label, i) => (
            <div key={i}>{label.label}</div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute left-20 bottom-0 flex flex-wrap gap-4 text-xs">
          {chartData.curves.map((curve, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: curve.color }}
              />
              <span className="text-zinc-400">{curve.goal.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0 border-t border-dashed border-amber-400" />
            <span className="text-zinc-400">Target</span>
          </div>
        </div>
      </div>
    </ChartTooltip>
  );
}
