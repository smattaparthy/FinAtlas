"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface IncomeExpensesChartProps {
  incomeSeries: SeriesPoint[];
  expenseSeries: SeriesPoint[];
  height?: number;
}

export default function IncomeExpensesChart({
  incomeSeries,
  expenseSeries,
  height = 300,
}: IncomeExpensesChartProps) {
  const chartData = useMemo(() => {
    if (!incomeSeries || incomeSeries.length === 0 || !expenseSeries || expenseSeries.length === 0) return null;

    // Sample every Nth point to avoid overcrowding
    const sampleRate = Math.max(1, Math.floor(incomeSeries.length / 50));
    const sampledIncome = incomeSeries.filter((_, i) => i % sampleRate === 0);
    const sampledExpense = expenseSeries.filter((_, i) => i % sampleRate === 0);

    const maxValue = Math.max(
      ...sampledIncome.map((d) => d.v),
      ...sampledExpense.map((d) => d.v)
    );
    const range = maxValue || 1;
    const padding = range * 0.1;
    const adjustedMax = maxValue + padding;

    const width = 100;
    const chartHeight = 100;
    const barWidth = width / sampledIncome.length;
    const barGap = barWidth * 0.1;
    const actualBarWidth = barWidth - barGap;

    // Generate bars
    const bars = sampledIncome.map((incomePoint, i) => {
      const expensePoint = sampledExpense[i];
      const x = i * barWidth;
      const incomeHeight = (incomePoint.v / adjustedMax) * chartHeight;
      const expenseHeight = (expensePoint.v / adjustedMax) * chartHeight;

      return {
        x,
        width: actualBarWidth,
        income: {
          height: incomeHeight,
          y: chartHeight - incomeHeight,
          value: incomePoint.v,
        },
        expense: {
          height: expenseHeight,
          y: chartHeight - expenseHeight,
          value: expensePoint.v,
        },
        date: new Date(incomePoint.t),
      };
    });

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = (adjustedMax * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    return { bars, ticks, adjustedMax };
  }, [incomeSeries, expenseSeries]);

  if (!chartData || incomeSeries.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  const tooltipData = chartData.bars.map((bar) => ({
    date: bar.date.toISOString(),
    values: [
      { label: "Income", value: bar.income.value, color: "rgb(59, 130, 246)" },
      { label: "Expenses", value: bar.expense.value, color: "rgb(251, 146, 60)" },
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
        <div className="absolute left-16 right-0 top-0 bottom-10">
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

            {/* Bars */}
            {chartData.bars.map((bar, i) => (
              <g key={i}>
                {/* Income bar (blue) */}
                <rect
                  x={bar.x}
                  y={bar.income.y}
                  width={bar.width / 2}
                  height={bar.income.height}
                  fill="rgb(59, 130, 246)"
                  opacity="0.8"
                />
                {/* Expense bar (orange) */}
                <rect
                  x={bar.x + bar.width / 2}
                  y={bar.expense.y}
                  width={bar.width / 2}
                  height={bar.expense.height}
                  fill="rgb(251, 146, 60)"
                  opacity="0.8"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-4 flex justify-between text-xs text-zinc-500">
          {chartData.bars.filter((_, i) => i === 0 || i === chartData.bars.length - 1 || i === Math.floor(chartData.bars.length / 4) || i === Math.floor(chartData.bars.length * 3 / 4)).map((bar, i) => (
            <div key={i}>{formatAxisDate(bar.date.toISOString())}</div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute left-16 bottom-0 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span className="text-zinc-400">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-zinc-400">Income</span>
          </div>
        </div>
      </div>
    </ChartTooltip>
  );
}
