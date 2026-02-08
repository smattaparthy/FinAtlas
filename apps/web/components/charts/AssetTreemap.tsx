"use client";

import { useMemo, useState } from "react";
import { formatCompactCurrency } from "@/lib/format";
import { calculateTreemapLayout, type TreemapRect } from "@/lib/visualizations/layouts";

interface HoldingData {
  name: string;
  value: number;
}

interface AccountData {
  name: string;
  type: string;
  value: number;
  children: HoldingData[];
}

interface AssetTreemapProps {
  accounts: AccountData[];
}

// Color by account type
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  TRADITIONAL_401K: "#10b981", // emerald
  ROTH_401K: "#34d399",       // emerald-400
  TRADITIONAL_IRA: "#059669", // emerald-600
  ROTH_IRA: "#6ee7b7",        // emerald-300
  BROKERAGE: "#3b82f6",       // blue
  SAVINGS: "#f59e0b",         // amber
  HSA: "#8b5cf6",             // purple/violet
  "529": "#06b6d4",           // cyan
};

function getAccountColor(type: string): string {
  return ACCOUNT_TYPE_COLORS[type] || "#6b7280";
}

function lightenColor(hex: string, factor: number): string {
  // Convert hex to rgb, lighten, convert back
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));

  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));

  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

export default function AssetTreemap({ accounts }: AssetTreemapProps) {
  const [hoveredRect, setHoveredRect] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    name: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const width = 800;
  const height = 500;

  const rects = useMemo(() => {
    if (accounts.length === 0) return [];

    // Build color map for accounts
    const colorMap: Record<string, string> = {};
    for (const account of accounts) {
      colorMap[account.name] = getAccountColor(account.type);
      // Assign lighter shades for children
      if (account.children) {
        for (const child of account.children) {
          colorMap[child.name] = lightenColor(getAccountColor(account.type), 0.15);
        }
      }
    }

    const items = accounts.map((a) => ({
      name: a.name,
      value: a.value,
      children: a.children.length > 0
        ? a.children.map((c) => ({ name: c.name, value: c.value }))
        : undefined,
    }));

    return calculateTreemapLayout(items, 0, 0, width, height, colorMap);
  }, [accounts]);

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        No account data to visualize.
      </div>
    );
  }

  function handleMouseEnter(
    rect: TreemapRect,
    event: React.MouseEvent<SVGRectElement | SVGGElement>
  ) {
    setHoveredRect(rect.name);
    const svg = event.currentTarget.closest("svg");
    if (svg) {
      const svgRect = svg.getBoundingClientRect();
      setTooltip({
        name: rect.name,
        value: rect.value,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top,
      });
    }
  }

  function handleMouseMove(event: React.MouseEvent) {
    const svg = event.currentTarget.closest("svg");
    if (svg && tooltip) {
      const svgRect = svg.getBoundingClientRect();
      setTooltip((prev) =>
        prev ? { ...prev, x: event.clientX - svgRect.left, y: event.clientY - svgRect.top } : null
      );
    }
  }

  function handleMouseLeave() {
    setHoveredRect(null);
    setTooltip(null);
  }

  function renderRect(rect: TreemapRect, isChild: boolean = false) {
    if (rect.width < 2 || rect.height < 2) return null;

    const isHovered = hoveredRect === rect.name;
    const showLabel = rect.width > 50 && rect.height > 30;
    const showValue = rect.width > 60 && rect.height > 45;
    const fillColor = isHovered ? lightenColor(rect.color, 0.15) : rect.color;
    const fillOpacity = isChild ? 0.6 : 0.4;

    return (
      <g key={rect.name}>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={isHovered ? lightenColor(rect.color, 0.3) : darkenColor(rect.color, 0.3)}
          strokeWidth={isHovered ? 2 : 1}
          rx={4}
          ry={4}
          className="transition-all duration-100 cursor-pointer"
          onMouseEnter={(e) => handleMouseEnter(rect, e)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Label */}
        {showLabel && (
          <text
            x={rect.x + 6}
            y={rect.y + 16}
            className="fill-zinc-100 pointer-events-none"
            style={{ fontSize: isChild ? "10px" : "12px", fontWeight: isChild ? 400 : 500 }}
          >
            {truncateText(rect.name, rect.width / (isChild ? 6 : 7))}
          </text>
        )}

        {/* Value */}
        {showValue && (
          <text
            x={rect.x + 6}
            y={rect.y + 30}
            className="fill-zinc-400 pointer-events-none"
            style={{ fontSize: isChild ? "9px" : "10px" }}
          >
            {formatCompactCurrency(rect.value)}
          </text>
        )}

        {/* Render children */}
        {rect.children?.map((child) => renderRect(child, true))}
      </g>
    );
  }

  // Build legend from account types present
  const typesSeen = new Set<string>();
  const legendItems: Array<{ type: string; label: string; color: string }> = [];
  const typeLabels: Record<string, string> = {
    TRADITIONAL_401K: "401(k)",
    ROTH_401K: "Roth 401(k)",
    TRADITIONAL_IRA: "IRA",
    ROTH_IRA: "Roth IRA",
    BROKERAGE: "Brokerage",
    SAVINGS: "Savings",
    HSA: "HSA",
    "529": "529 Plan",
  };

  for (const account of accounts) {
    if (!typesSeen.has(account.type)) {
      typesSeen.add(account.type);
      legendItems.push({
        type: account.type,
        label: typeLabels[account.type] || account.type,
        color: getAccountColor(account.type),
      });
    }
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {rects.map((rect) => renderRect(rect))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg shadow-black/40"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            transform: tooltip.x > 500 ? "translateX(-120%)" : undefined,
          }}
        >
          <div className="text-zinc-400">{tooltip.name}</div>
          <div className="font-medium text-zinc-50">
            {formatCompactCurrency(tooltip.value)}
          </div>
        </div>
      )}
    </div>
  );
}

function truncateText(text: string, maxChars: number): string {
  const max = Math.max(3, Math.floor(maxChars));
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}
