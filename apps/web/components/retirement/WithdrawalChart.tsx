"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { RetirementYearProjection } from "@/lib/retirement/retirementIncomeCalculations";

interface WithdrawalChartProps {
  projection: RetirementYearProjection[];
  height?: number;
}

const COLORS = {
  ss: "rgb(59, 130, 246)", // blue-500
  pension: "rgb(168, 85, 247)", // purple-500
  withdrawals: "rgb(16, 185, 129)", // emerald-500
};

export default function WithdrawalChart({
  projection,
  height = 350,
}: WithdrawalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const chartData = useMemo(() => {
    if (projection.length === 0) return null;

    const maxIncome = Math.max(
      ...projection.map((p) => p.ssIncome + p.pensionIncome + p.accountWithdrawals),
      1
    );
    const yMax = maxIncome * 1.1; // 10% padding

    const svgW = 100;
    const svgH = 60;

    // Tick values for Y-axis (4 ticks)
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = yMax - (i / (tickCount - 1)) * yMax;
      const y = (i / (tickCount - 1)) * svgH;
      return { value, y };
    });

    // Bar data
    const barWidth = (svgW / projection.length) * 0.7;
    const barGap = (svgW / projection.length) * 0.3;

    const bars = projection.map((p, i) => {
      const x = (i / projection.length) * svgW + barGap / 2;

      const ssH = (p.ssIncome / yMax) * svgH;
      const pensionH = (p.pensionIncome / yMax) * svgH;
      const withdrawH = (p.accountWithdrawals / yMax) * svgH;

      // Stack from bottom
      const ssY = svgH - ssH;
      const pensionY = ssY - pensionH;
      const withdrawY = pensionY - withdrawH;

      return { x, barWidth, ssY, ssH, pensionY, pensionH, withdrawY, withdrawH };
    });

    // X-axis labels (every 5 years)
    const xLabels: { age: number; x: number }[] = [];
    for (let i = 0; i < projection.length; i++) {
      if (projection[i].age % 5 === 0) {
        xLabels.push({
          age: projection[i].age,
          x: (i / projection.length) * svgW + barWidth / 2 + barGap / 2,
        });
      }
    }

    return { bars, ticks, xLabels, svgW, svgH, yMax };
  }, [projection]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !chartData) return;
      const rect = containerRef.current.getBoundingClientRect();
      const chartLeft = 64; // match y-axis label width
      const chartWidth = rect.width - chartLeft;
      const x = e.clientX - rect.left - chartLeft;
      const ratio = Math.max(0, Math.min(1, x / chartWidth));
      const idx = Math.min(
        Math.floor(ratio * projection.length),
        projection.length - 1
      );
      setHoverIndex(idx);
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [projection.length, chartData]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  if (!chartData) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  const hoveredPoint = hoverIndex !== null ? projection[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
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
          <svg
            viewBox={`0 0 ${chartData.svgW} ${chartData.svgH}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Grid lines */}
            {chartData.ticks.map((tick, i) => (
              <line
                key={i}
                x1="0"
                y1={tick.y}
                x2={chartData.svgW}
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="0.2"
                className="text-zinc-800"
              />
            ))}

            {/* Stacked bars */}
            {chartData.bars.map((bar, i) => (
              <g
                key={i}
                opacity={hoverIndex !== null && hoverIndex !== i ? 0.5 : 1}
              >
                {/* SS (bottom) */}
                {bar.ssH > 0 && (
                  <rect
                    x={bar.x}
                    y={bar.ssY}
                    width={bar.barWidth}
                    height={bar.ssH}
                    fill={COLORS.ss}
                    rx="0.3"
                  />
                )}
                {/* Pension (middle) */}
                {bar.pensionH > 0 && (
                  <rect
                    x={bar.x}
                    y={bar.pensionY}
                    width={bar.barWidth}
                    height={bar.pensionH}
                    fill={COLORS.pension}
                    rx="0.3"
                  />
                )}
                {/* Account Withdrawals (top) */}
                {bar.withdrawH > 0 && (
                  <rect
                    x={bar.x}
                    y={bar.withdrawY}
                    width={bar.barWidth}
                    height={bar.withdrawH}
                    fill={COLORS.withdrawals}
                    rx="0.3"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex text-xs text-zinc-500">
          {chartData.xLabels.map((label) => (
            <div
              key={label.age}
              className="absolute"
              style={{
                left: `${(label.x / chartData.svgW) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {label.age}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.ss }} />
            <span>Social Security</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.pension }} />
            <span>Pension</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.withdrawals }} />
            <span>Withdrawals</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg shadow-black/40"
          style={{
            left:
              mousePos.x > (containerRef.current?.clientWidth ?? 400) * 0.7
                ? mousePos.x - 180
                : mousePos.x + 12,
            top: 8,
          }}
        >
          <div className="text-zinc-400 mb-1 font-medium">
            Age {hoveredPoint.age} ({hoveredPoint.year})
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.ss }}
            />
            <span className="text-zinc-300">Social Security:</span>
            <span className="font-medium text-zinc-50">
              {formatCurrency(hoveredPoint.ssIncome)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.pension }}
            />
            <span className="text-zinc-300">Pension:</span>
            <span className="font-medium text-zinc-50">
              {formatCurrency(hoveredPoint.pensionIncome)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.withdrawals }}
            />
            <span className="text-zinc-300">Withdrawals:</span>
            <span className="font-medium text-zinc-50">
              {formatCurrency(hoveredPoint.accountWithdrawals)}
            </span>
          </div>
          <div className="border-t border-zinc-700 mt-1 pt-1 flex items-center gap-2">
            <span className="text-zinc-300">Total:</span>
            <span className="font-medium text-zinc-50">
              {formatCurrency(hoveredPoint.totalIncome)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
