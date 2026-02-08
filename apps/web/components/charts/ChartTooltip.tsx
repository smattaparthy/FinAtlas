"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";

interface TooltipLine {
  label: string;
  color: string;
}

interface DataPoint {
  date: string;
  values: { label: string; value: number; color: string }[];
}

interface ChartTooltipProps {
  /** Array of data points with date and values for tooltip display */
  data: DataPoint[];
  /** Format function for values. Defaults to formatCompactCurrency */
  formatValue?: (v: number) => string;
  /** The left offset of the chart area (in px), matching the y-axis label width */
  leftOffset?: number;
  children: ReactNode;
}

export default function ChartTooltip({
  data,
  formatValue = formatCompactCurrency,
  leftOffset = 64,
  children,
}: ChartTooltipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || data.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const chartLeft = leftOffset;
      const chartWidth = rect.width - chartLeft;
      const x = e.clientX - rect.left - chartLeft;
      const ratio = Math.max(0, Math.min(1, x / chartWidth));
      const idx = Math.round(ratio * (data.length - 1));
      setHoverIndex(idx);
      setMouseX(e.clientX - rect.left);
    },
    [data.length, leftOffset]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const point = hoverIndex !== null ? data[hoverIndex] : null;

  // Calculate crosshair position as percentage of chart area
  const crosshairPct =
    hoverIndex !== null && data.length > 1
      ? (hoverIndex / (data.length - 1)) * 100
      : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}

      {/* Crosshair line - rendered over the SVG chart area */}
      {hoverIndex !== null && (
        <div
          className="absolute top-0 bottom-6 w-px bg-zinc-500/60 pointer-events-none"
          style={{ left: `calc(${leftOffset}px + ${crosshairPct}% * (100% - ${leftOffset}px) / 100)` }}
        />
      )}

      {/* Tooltip card */}
      {point && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg shadow-black/40"
          style={{
            left: mouseX + 12,
            top: 8,
            transform: mouseX > (containerRef.current?.clientWidth ?? 400) * 0.7 ? "translateX(-120%)" : undefined,
          }}
        >
          <div className="text-zinc-400 mb-1">{formatAxisDate(point.date)}</div>
          {point.values.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
              <span className="text-zinc-300">{v.label}:</span>
              <span className="font-medium text-zinc-50">{formatValue(v.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
