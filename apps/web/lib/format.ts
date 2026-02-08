/**
 * Shared formatting utilities used across the app.
 */

/** Standard currency format: $310,000 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact currency for axis labels: $2.5M, -$71.6M, $835K */
export function formatCompactCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1_000_000) {
    return `${sign}$${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}$${(absAmount / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${absAmount.toFixed(0)}`;
}

/** Format ISO date for axis labels: "2026-02" -> "Feb 2026" */
export function formatAxisDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Format a decimal as percentage: 0.156 -> "15.6%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
