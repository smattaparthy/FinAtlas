"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface HeatmapCell {
  date: string;
  amount: number;
}

interface SpendingHeatmapProps {
  cells: HeatmapCell[];
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

const INTENSITY_COLORS = [
  "#27272a", // zinc-800 (zero / no data)
  "#064e3b", // emerald-900
  "#047857", // emerald-700
  "#10b981", // emerald-500
  "#6ee7b7", // emerald-300
];

export default function SpendingHeatmap({ cells }: SpendingHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    amount: number;
    x: number;
    y: number;
  } | null>(null);

  const { grid, weeks, maxAmount } = useMemo(() => {
    if (cells.length === 0) {
      return { grid: [], weeks: [], maxAmount: 0 };
    }

    // Find the max amount for intensity scaling
    const max = Math.max(...cells.map((c) => c.amount), 0);

    // Organize cells into a 7-row (days) x N-col (weeks) grid
    // Start from the earliest date, align to weeks
    const dateMap = new Map<string, number>();
    for (const cell of cells) {
      dateMap.set(cell.date, cell.amount);
    }

    // Build grid: last 12 weeks
    const now = new Date();
    const gridCells: Array<Array<{ date: string; amount: number; dayOfWeek: number } | null>> = [];
    const weekLabels: string[] = [];

    // Find the Monday of 12 weeks ago
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 83); // 12 weeks * 7 - 1
    // Adjust to Monday
    const dayOffset = (startDate.getDay() + 6) % 7; // 0=Mon..6=Sun
    startDate.setDate(startDate.getDate() - dayOffset);

    let currentDate = new Date(startDate);
    let weekIndex = 0;

    while (currentDate <= now) {
      const weekCells: Array<{ date: string; amount: number; dayOfWeek: number } | null> = [];
      const weekStart = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weekLabels.push(weekStart);

      for (let day = 0; day < 7; day++) {
        if (currentDate > now) {
          weekCells.push(null);
        } else {
          const dateStr = currentDate.toISOString().split("T")[0];
          const amount = dateMap.get(dateStr) || 0;
          weekCells.push({
            date: dateStr,
            amount,
            dayOfWeek: day,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      gridCells.push(weekCells);
      weekIndex++;
    }

    return { grid: gridCells, weeks: weekLabels, maxAmount: max };
  }, [cells]);

  if (cells.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        No spending data to visualize.
      </div>
    );
  }

  function getIntensityColor(amount: number): string {
    if (amount <= 0 || maxAmount <= 0) return INTENSITY_COLORS[0];
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return INTENSITY_COLORS[1];
    if (ratio < 0.5) return INTENSITY_COLORS[2];
    if (ratio < 0.75) return INTENSITY_COLORS[3];
    return INTENSITY_COLORS[4];
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pr-2 pt-6">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-4 w-6 flex items-center justify-end text-[10px] text-zinc-500"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Week labels */}
          <div className="flex gap-1 mb-1">
            {grid.map((_, weekIdx) => (
              <div
                key={weekIdx}
                className="flex-1 min-w-[18px] text-center text-[9px] text-zinc-500 truncate"
              >
                {weekIdx % 2 === 0 ? weeks[weekIdx] : ""}
              </div>
            ))}
          </div>

          {/* Heatmap cells - rows = days of week, columns = weeks */}
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div key={dayIdx} className="flex gap-1 mb-1">
              {grid.map((week, weekIdx) => {
                const cell = week[dayIdx];
                if (!cell) {
                  return (
                    <div
                      key={weekIdx}
                      className="flex-1 min-w-[18px] h-4 rounded-sm bg-zinc-900/30"
                    />
                  );
                }
                return (
                  <div
                    key={weekIdx}
                    className="flex-1 min-w-[18px] h-4 rounded-sm cursor-pointer transition-all duration-100 hover:ring-1 hover:ring-zinc-400"
                    style={{ backgroundColor: getIntensityColor(cell.amount) }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget.closest(".relative");
                      const parentRect = parent?.getBoundingClientRect();
                      setHoveredCell({
                        date: cell.date,
                        amount: cell.amount,
                        x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                        y: rect.top - (parentRect?.top || 0) - 8,
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-zinc-500">
        <span>Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg shadow-black/40 -translate-x-1/2 -translate-y-full"
          style={{ left: hoveredCell.x, top: hoveredCell.y }}
        >
          <div className="text-zinc-400">{formatDate(hoveredCell.date)}</div>
          <div className="font-medium text-zinc-50">
            {hoveredCell.amount > 0 ? formatCurrency(hoveredCell.amount) : "No spending"}
          </div>
        </div>
      )}
    </div>
  );
}
