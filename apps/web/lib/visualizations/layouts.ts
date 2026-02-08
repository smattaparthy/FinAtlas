/**
 * Layout algorithms for visualization charts.
 */

// ============== SANKEY LAYOUT ==============

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

export interface SankeyNode {
  x: number;
  y: number;
  height: number;
  name: string;
  amount: number;
  color: string;
}

export interface SankeyPath {
  d: string;
  color: string;
  amount: number;
  from: string;
  to: string;
}

export interface SankeyLayout {
  sourceNodes: SankeyNode[];
  targetNodes: SankeyNode[];
  paths: SankeyPath[];
}

const SOURCE_COLOR = "#10b981"; // emerald-500

const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function calculateSankeyLayout(
  sources: SankeySource[],
  targets: SankeyTarget[],
  flows: SankeyFlow[],
  width: number,
  height: number
): SankeyLayout {
  if (sources.length === 0 || targets.length === 0 || flows.length === 0) {
    return { sourceNodes: [], targetNodes: [], paths: [] };
  }

  const nodeWidth = 20;
  const padding = 60;
  const nodePadding = 12;

  const leftX = padding;
  const rightX = width - padding - nodeWidth;

  const totalSourceAmount = sources.reduce((s, src) => s + src.amount, 0);
  const totalTargetAmount = targets.reduce((s, tgt) => s + tgt.amount, 0);

  const availableHeight = height - padding * 2;

  // Position source nodes on left
  const sourceNodes: SankeyNode[] = [];
  let sourceY = padding;
  const sourceGapTotal = Math.max(0, (sources.length - 1) * nodePadding);
  const sourceDrawHeight = availableHeight - sourceGapTotal;

  for (const src of sources) {
    const nodeHeight = totalSourceAmount > 0
      ? (src.amount / totalSourceAmount) * sourceDrawHeight
      : sourceDrawHeight / sources.length;
    sourceNodes.push({
      x: leftX,
      y: sourceY,
      height: Math.max(nodeHeight, 4),
      name: src.name,
      amount: src.amount,
      color: SOURCE_COLOR,
    });
    sourceY += nodeHeight + nodePadding;
  }

  // Position target nodes on right
  const targetNodes: SankeyNode[] = [];
  let targetY = padding;
  const targetGapTotal = Math.max(0, (targets.length - 1) * nodePadding);
  const targetDrawHeight = availableHeight - targetGapTotal;

  for (let i = 0; i < targets.length; i++) {
    const tgt = targets[i];
    const nodeHeight = totalTargetAmount > 0
      ? (tgt.amount / totalTargetAmount) * targetDrawHeight
      : targetDrawHeight / targets.length;
    targetNodes.push({
      x: rightX,
      y: targetY,
      height: Math.max(nodeHeight, 4),
      name: tgt.name,
      amount: tgt.amount,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    });
    targetY += nodeHeight + nodePadding;
  }

  // Track cumulative offsets within each node for stacking flows
  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};

  for (const sn of sourceNodes) sourceOffsets[sn.name] = 0;
  for (const tn of targetNodes) targetOffsets[tn.name] = 0;

  // Generate bezier paths for flows
  const paths: SankeyPath[] = [];
  const sortedFlows = [...flows].sort((a, b) => b.amount - a.amount);

  for (const flow of sortedFlows) {
    const sourceNode = sourceNodes.find((n) => n.name === flow.from);
    const targetNode = targetNodes.find((n) => n.name === flow.to);
    if (!sourceNode || !targetNode) continue;

    // Calculate flow band height proportional to node heights
    const sourceFlowHeight = totalSourceAmount > 0
      ? (flow.amount / sourceNode.amount) * sourceNode.height
      : sourceNode.height;
    const targetFlowHeight = totalTargetAmount > 0
      ? (flow.amount / targetNode.amount) * targetNode.height
      : targetNode.height;

    const sy1 = sourceNode.y + (sourceOffsets[flow.from] || 0);
    const sy2 = sy1 + sourceFlowHeight;
    const ty1 = targetNode.y + (targetOffsets[flow.to] || 0);
    const ty2 = ty1 + targetFlowHeight;

    sourceOffsets[flow.from] = (sourceOffsets[flow.from] || 0) + sourceFlowHeight;
    targetOffsets[flow.to] = (targetOffsets[flow.to] || 0) + targetFlowHeight;

    const sx = leftX + nodeWidth;
    const tx = rightX;
    const mx = (sx + tx) / 2;

    // Cubic bezier path forming a band
    const d = [
      `M ${sx} ${sy1}`,
      `C ${mx} ${sy1}, ${mx} ${ty1}, ${tx} ${ty1}`,
      `L ${tx} ${ty2}`,
      `C ${mx} ${ty2}, ${mx} ${sy2}, ${sx} ${sy2}`,
      `Z`,
    ].join(" ");

    paths.push({
      d,
      color: targetNode.color,
      amount: flow.amount,
      from: flow.from,
      to: flow.to,
    });
  }

  return { sourceNodes, targetNodes, paths };
}

// ============== TREEMAP LAYOUT ==============

export interface TreemapItem {
  name: string;
  value: number;
  children?: TreemapItem[];
}

export interface TreemapRect {
  name: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  children?: TreemapRect[];
}

/**
 * Squarified treemap layout algorithm.
 * Sorts items by value descending, then recursively partitions rectangles
 * to maintain aspect ratios close to 1.
 */
export function calculateTreemapLayout(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  colorMap?: Record<string, string>
): TreemapRect[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const totalValue = items.reduce((s, item) => s + item.value, 0);
  if (totalValue <= 0) return [];

  const sorted = [...items].sort((a, b) => b.value - a.value);

  const rects = squarify(sorted, totalValue, x, y, width, height, colorMap);

  // Recursively layout children within each rect
  return rects.map((rect) => {
    const original = items.find((i) => i.name === rect.name);
    if (original?.children && original.children.length > 0 && rect.width > 2 && rect.height > 2) {
      const childPadding = 2;
      const childRects = calculateTreemapLayout(
        original.children,
        rect.x + childPadding,
        rect.y + childPadding + 16, // leave room for parent label
        Math.max(rect.width - childPadding * 2, 0),
        Math.max(rect.height - childPadding * 2 - 16, 0),
        colorMap
      );
      return { ...rect, children: childRects };
    }
    return rect;
  });
}

function squarify(
  items: TreemapItem[],
  totalValue: number,
  x: number,
  y: number,
  w: number,
  h: number,
  colorMap?: Record<string, string>
): TreemapRect[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  if (items.length === 1) {
    const item = items[0];
    return [{
      name: item.name,
      value: item.value,
      x,
      y,
      width: w,
      height: h,
      color: colorMap?.[item.name] || "#6b7280",
    }];
  }

  const totalArea = w * h;
  const isWide = w >= h;

  // Greedy squarified algorithm
  const row: TreemapItem[] = [];
  let rowValue = 0;
  let remaining = [...items];
  let best = Infinity;

  for (let i = 0; i < remaining.length; i++) {
    const item = remaining[i];
    const testRow = [...row, item];
    const testValue = rowValue + item.value;
    const worst = worstAspectRatio(testRow, testValue, totalValue, totalArea, isWide ? h : w);

    if (worst <= best || row.length === 0) {
      row.push(item);
      rowValue = testValue;
      best = worst;
    } else {
      // Layout current row and recurse on remaining
      const rowFraction = rowValue / totalValue;
      const rects: TreemapRect[] = [];

      if (isWide) {
        const rowWidth = w * rowFraction;
        let cy = y;
        for (const r of row) {
          const rh = rowValue > 0 ? (r.value / rowValue) * h : h / row.length;
          rects.push({
            name: r.name,
            value: r.value,
            x,
            y: cy,
            width: rowWidth,
            height: rh,
            color: colorMap?.[r.name] || "#6b7280",
          });
          cy += rh;
        }
        const rest = squarify(
          remaining.slice(i),
          totalValue - rowValue,
          x + rowWidth,
          y,
          w - rowWidth,
          h,
          colorMap
        );
        return [...rects, ...rest];
      } else {
        const rowHeight = h * rowFraction;
        let cx = x;
        for (const r of row) {
          const rw = rowValue > 0 ? (r.value / rowValue) * w : w / row.length;
          rects.push({
            name: r.name,
            value: r.value,
            x: cx,
            y,
            width: rw,
            height: rowHeight,
            color: colorMap?.[r.name] || "#6b7280",
          });
          cx += rw;
        }
        const rest = squarify(
          remaining.slice(i),
          totalValue - rowValue,
          x,
          y + rowHeight,
          w,
          h - rowHeight,
          colorMap
        );
        return [...rects, ...rest];
      }
    }
  }

  // All items ended up in one row
  const rects: TreemapRect[] = [];
  if (isWide) {
    let cy = y;
    for (const r of row) {
      const rh = rowValue > 0 ? (r.value / rowValue) * h : h / row.length;
      rects.push({
        name: r.name,
        value: r.value,
        x,
        y: cy,
        width: w,
        height: rh,
        color: colorMap?.[r.name] || "#6b7280",
      });
      cy += rh;
    }
  } else {
    let cx = x;
    for (const r of row) {
      const rw = rowValue > 0 ? (r.value / rowValue) * w : w / row.length;
      rects.push({
        name: r.name,
        value: r.value,
        x: cx,
        y,
        width: rw,
        height: w,
        color: colorMap?.[r.name] || "#6b7280",
      });
      cx += rw;
    }
  }

  return rects;
}

function worstAspectRatio(
  row: TreemapItem[],
  rowValue: number,
  totalValue: number,
  totalArea: number,
  sideLength: number
): number {
  if (row.length === 0 || rowValue === 0 || totalValue === 0) return Infinity;

  const rowArea = (rowValue / totalValue) * totalArea;
  const rowSide = rowArea / sideLength;

  let worst = 0;
  for (const item of row) {
    const itemArea = (item.value / totalValue) * totalArea;
    const itemSide = itemArea / rowSide;
    const aspect = Math.max(itemSide / rowSide, rowSide / itemSide);
    worst = Math.max(worst, aspect);
  }
  return worst;
}
