"use client";

import { useState } from "react";
import { formatCompactCurrency } from "@/lib/format";
import {
  calculateSankeyLayout,
  type SankeyNode,
  type SankeyPath,
} from "@/lib/visualizations/layouts";

interface SankeySource {
  name: string;
  amount: number;
}

interface SankeyTarget {
  name: string;
  amount: number;
}

interface SankeyFlow {
  from: string;
  to: string;
  amount: number;
}

interface CashFlowSankeyProps {
  sources: SankeySource[];
  targets: SankeyTarget[];
  flows: SankeyFlow[];
}

export default function CashFlowSankey({ sources, targets, flows }: CashFlowSankeyProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    from: string;
    to: string;
    amount: number;
  } | null>(null);

  const width = 800;
  const height = 500;

  const layout = calculateSankeyLayout(sources, targets, flows, width, height);

  if (layout.sourceNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        No income or expense data to visualize.
      </div>
    );
  }

  const handlePathMouseEnter = (path: SankeyPath, event: React.MouseEvent<SVGPathElement>) => {
    const key = `${path.from}-${path.to}`;
    setHoveredPath(key);
    const svg = event.currentTarget.closest("svg");
    if (svg) {
      const rect = svg.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        from: path.from,
        to: path.to,
        amount: path.amount,
      });
    }
  };

  const handlePathMouseMove = (event: React.MouseEvent<SVGPathElement>) => {
    const svg = event.currentTarget.closest("svg");
    if (svg && tooltip) {
      const rect = svg.getBoundingClientRect();
      setTooltip((prev) =>
        prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null
      );
    }
  };

  const handlePathMouseLeave = () => {
    setHoveredPath(null);
    setTooltip(null);
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Flow paths */}
        {layout.paths.map((path, i) => {
          const key = `${path.from}-${path.to}`;
          const isHovered = hoveredPath === key;
          const isDimmed = hoveredPath !== null && !isHovered;

          return (
            <path
              key={i}
              d={path.d}
              fill={path.color}
              fillOpacity={isDimmed ? 0.1 : isHovered ? 0.5 : 0.3}
              stroke={isHovered ? path.color : "none"}
              strokeWidth={isHovered ? 1 : 0}
              className="transition-opacity duration-150 cursor-pointer"
              onMouseEnter={(e) => handlePathMouseEnter(path, e)}
              onMouseMove={handlePathMouseMove}
              onMouseLeave={handlePathMouseLeave}
            />
          );
        })}

        {/* Source nodes (left) */}
        {layout.sourceNodes.map((node, i) => (
          <g key={`source-${i}`}>
            <rect
              x={node.x}
              y={node.y}
              width={20}
              height={node.height}
              fill={node.color}
              rx={3}
              ry={3}
            />
            {/* Label to the left of source node */}
            <text
              x={node.x - 8}
              y={node.y + node.height / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-zinc-300"
              style={{ fontSize: "11px" }}
            >
              {truncateLabel(node.name, 16)}
            </text>
            <text
              x={node.x - 8}
              y={node.y + node.height / 2 + 14}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-zinc-500"
              style={{ fontSize: "10px" }}
            >
              {formatCompactCurrency(node.amount)}
            </text>
          </g>
        ))}

        {/* Target nodes (right) */}
        {layout.targetNodes.map((node, i) => (
          <g key={`target-${i}`}>
            <rect
              x={node.x}
              y={node.y}
              width={20}
              height={node.height}
              fill={node.color}
              rx={3}
              ry={3}
            />
            {/* Label to the right of target node */}
            <text
              x={node.x + 28}
              y={node.y + node.height / 2}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-zinc-300"
              style={{ fontSize: "11px" }}
            >
              {truncateLabel(node.name, 16)}
            </text>
            <text
              x={node.x + 28}
              y={node.y + node.height / 2 + 14}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-zinc-500"
              style={{ fontSize: "10px" }}
            >
              {formatCompactCurrency(node.amount)}
            </text>
          </g>
        ))}
      </svg>

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
          <div className="text-zinc-400 mb-1">
            {tooltip.from} &rarr; {tooltip.to}
          </div>
          <div className="font-medium text-zinc-50">
            {formatCompactCurrency(tooltip.amount)}/yr
          </div>
        </div>
      )}
    </div>
  );
}

function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + "\u2026";
}
