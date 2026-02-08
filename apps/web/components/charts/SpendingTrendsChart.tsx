"use client";

import { useMemo } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface SpendingTrendsChartProps {
  data: Array<{ month: string; categories: Record<string, number>; total: number }>;
  height?: number;
}

const CATEGORY_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

export default function SpendingTrendsChart({ data, height = 350 }: SpendingTrendsChartProps) {
  const { processedData, maxValue, yAxisLabels, allCategories, tooltipData } = useMemo(() => {
    if (data.length === 0) {
      return {
        processedData: [],
        maxValue: 0,
        yAxisLabels: ["$0"],
        allCategories: [],
        tooltipData: [],
      };
    }

    // Collect all unique categories across all months
    const categorySet = new Set<string>();
    for (const month of data) {
      Object.keys(month.categories).forEach((cat) => categorySet.add(cat));
    }

    // Sort categories by total spending (largest first for bottom of stack)
    const categoryTotals = Array.from(categorySet).map((cat) => {
      const total = data.reduce((sum, month) => sum + (month.categories[cat] || 0), 0);
      return { category: cat, total };
    });
    categoryTotals.sort((a, b) => b.total - a.total);

    const sortedCategories = categoryTotals.map((c) => ({
      name: c.category,
      color: CATEGORY_COLORS[categoryTotals.indexOf(c) % CATEGORY_COLORS.length],
    }));

    // Calculate cumulative values for stacked areas
    const processed = data.map((month) => {
      let cumulative = 0;
      const categoryValues = sortedCategories.map((cat) => {
        const value = month.categories[cat.name] || 0;
        const y0 = cumulative;
        cumulative += value;
        const y1 = cumulative;
        return { category: cat.name, value, y0, y1, color: cat.color };
      });
      return { month: month.month, categoryValues, total: cumulative };
    });

    // Calculate max value for Y-axis
    const max = Math.max(...processed.map((p) => p.total), 1);
    const roundedMax = Math.ceil(max / 1000) * 1000;

    // Generate Y-axis labels (5 labels from 0 to max)
    const labels = [];
    for (let i = 0; i <= 4; i++) {
      labels.push(formatCompactCurrency((roundedMax / 4) * (4 - i)));
    }

    // Prepare tooltip data
    const tooltip = data.map((month) => ({
      date: month.month,
      values: sortedCategories
        .map((cat) => ({
          label: cat.name,
          value: month.categories[cat.name] || 0,
          color: cat.color,
        }))
        .filter((v) => v.value > 0),
    }));

    return {
      processedData: processed,
      maxValue: roundedMax,
      yAxisLabels: labels,
      allCategories: sortedCategories,
      tooltipData: tooltip,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-zinc-500 text-sm" style={{ height }}>
        No spending data available
      </div>
    );
  }

  // Generate SVG path for each category's stacked area
  const generateAreaPath = (categoryIndex: number): string => {
    const points: Array<{ x: number; y0: number; y1: number }> = [];

    processedData.forEach((month, i) => {
      const x = (i / (processedData.length - 1)) * 100;
      const catData = month.categoryValues[categoryIndex];
      const y0 = ((maxValue - catData.y0) / maxValue) * 100;
      const y1 = ((maxValue - catData.y1) / maxValue) * 100;
      points.push({ x, y0, y1 });
    });

    if (points.length === 0) return "";

    // Create path with top line and bottom line
    let path = `M ${points[0].x} ${points[0].y1}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y1}`;
    }
    // Bottom line (reversed)
    for (let i = points.length - 1; i >= 0; i--) {
      path += ` L ${points[i].x} ${points[i].y0}`;
    }
    path += " Z";

    return path;
  };

  // Generate X-axis labels (show every Nth label to avoid crowding)
  const xAxisLabels = data
    .map((month, i) => {
      const showLabel = data.length <= 6 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1;
      return showLabel ? { month: month.month, x: (i / (data.length - 1)) * 100 } : null;
    })
    .filter((item): item is { month: string; x: number } => item !== null);

  return (
    <ChartTooltip data={tooltipData} leftOffset={64}>
      <div className="relative w-full" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-zinc-500 text-right pr-2">
          {yAxisLabels.map((label, i) => (
            <div key={i} className="leading-none">
              {label}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute left-16 right-0 top-0 bottom-6">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#27272a"
                strokeWidth="0.2"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Stacked area paths */}
            {allCategories.map((cat, i) => (
              <path key={cat.name} d={generateAreaPath(i)} fill={cat.color} opacity={0.7} />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 h-6 flex justify-between text-xs text-zinc-500">
          {xAxisLabels.map((item) => (
            <div
              key={item.month}
              className="absolute -translate-x-1/2"
              style={{ left: `${item.x}%` }}
            >
              {formatAxisDate(item.month)}
            </div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
}
