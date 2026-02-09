"use client";

import { formatCurrency } from "@/lib/format";

interface TaxLossTableProps {
  candidates: {
    symbol: string;
    unrealizedLoss: number;
    taxSavings: number;
    holdingPeriod: "SHORT" | "LONG";
  }[];
}

export default function TaxLossTable({ candidates }: TaxLossTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">
          No harvesting candidates found. All holdings are at gains or
          break-even.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Symbol
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Period
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
              Unrealized Loss
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
              Tax Savings
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {candidates.map((candidate, idx) => (
            <tr key={idx} className="hover:bg-zinc-900/30">
              <td className="px-4 py-3 text-sm font-medium text-zinc-50">
                {candidate.symbol}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    candidate.holdingPeriod === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {candidate.holdingPeriod === "LONG" ? "Long-term" : "Short-term"}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-red-400">
                {formatCurrency(candidate.unrealizedLoss)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">
                {formatCurrency(candidate.taxSavings)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-zinc-700 bg-zinc-900/70">
          <tr>
            <td
              colSpan={2}
              className="px-4 py-3 text-sm font-medium text-zinc-50"
            >
              Total
            </td>
            <td className="px-4 py-3 text-right text-sm font-bold text-red-400">
              {formatCurrency(
                candidates.reduce((sum, c) => sum + c.unrealizedLoss, 0)
              )}
            </td>
            <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">
              {formatCurrency(
                candidates.reduce((sum, c) => sum + c.taxSavings, 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
