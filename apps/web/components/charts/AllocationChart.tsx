"use client";

import { formatCurrency } from "@/lib/format";
import type { AllocationItem } from "@/lib/rebalancing/rebalancingCalculations";

const ASSET_COLORS: Record<string, string> = {
  Stocks: "#10b981",  // emerald-500
  Bonds: "#3b82f6",   // blue-500
  Cash: "#f59e0b",    // amber-500
};

interface AllocationChartProps {
  allocations: AllocationItem[];
  totalValue: number;
  height?: number;
}

export default function AllocationChart({ allocations, totalValue, height = 300 }: AllocationChartProps) {
  const centerX = 100;
  const centerY = 100;
  const outerRadius = 80;
  const innerRadius = 50;

  // Filter out allocations with 0 value
  const visibleAllocations = allocations.filter((a) => a.currentPct > 0);

  // Calculate arc paths
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock (-90 degrees)

  const arcs = visibleAllocations.map((allocation) => {
    const sweepAngle = (allocation.currentPct / 100) * 2 * Math.PI;
    const endAngle = currentAngle + sweepAngle;

    // Outer arc points
    const startOuterX = centerX + outerRadius * Math.cos(currentAngle);
    const startOuterY = centerY + outerRadius * Math.sin(currentAngle);
    const endOuterX = centerX + outerRadius * Math.cos(endAngle);
    const endOuterY = centerY + outerRadius * Math.sin(endAngle);

    // Inner arc points
    const startInnerX = centerX + innerRadius * Math.cos(currentAngle);
    const startInnerY = centerY + innerRadius * Math.sin(currentAngle);
    const endInnerX = centerX + innerRadius * Math.cos(endAngle);
    const endInnerY = centerY + innerRadius * Math.sin(endAngle);

    // Large arc flag (1 if sweep > 180 degrees)
    const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;

    // Build the path
    const path = [
      `M ${startOuterX} ${startOuterY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
      `L ${endInnerX} ${endInnerY}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`,
      `Z`,
    ].join(" ");

    const arc = {
      path,
      color: ASSET_COLORS[allocation.assetClass] || "#6b7280",
      assetClass: allocation.assetClass,
    };

    currentAngle = endAngle;
    return arc;
  });

  return (
    <div className="flex flex-col items-center" style={{ height }}>
      <svg viewBox="0 0 200 200" className="w-full max-w-sm">
        {arcs.map((arc, index) => (
          <path
            key={index}
            d={arc.path}
            fill={arc.color}
            stroke="none"
          />
        ))}

        {/* Center text */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium fill-zinc-50"
          style={{ fontSize: "12px" }}
        >
          {formatCurrency(totalValue)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {allocations.map((allocation) => (
          <div key={allocation.assetClass} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: ASSET_COLORS[allocation.assetClass] || "#6b7280" }}
            />
            <span className="text-sm text-zinc-400">
              {allocation.assetClass} {allocation.currentPct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
