"use client";

import { formatCurrency } from "@/lib/format";
import type { RetirementYearProjection } from "@/lib/retirement/retirementIncomeCalculations";

interface IncomeProjectionTableProps {
  projection: RetirementYearProjection[];
}

export default function IncomeProjectionTable({
  projection,
}: IncomeProjectionTableProps) {
  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-950">
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
            <th className="text-left py-2 pr-3 font-medium">Age</th>
            <th className="text-left py-2 px-3 font-medium">Year</th>
            <th className="text-right py-2 px-3 font-medium">SS Income</th>
            <th className="text-right py-2 px-3 font-medium">Pension</th>
            <th className="text-right py-2 px-3 font-medium">Withdrawals</th>
            <th className="text-right py-2 px-3 font-medium">Total Income</th>
            <th className="text-right py-2 px-3 font-medium">Est. Taxes</th>
            <th className="text-right py-2 pl-3 font-medium">Net Income</th>
          </tr>
        </thead>
        <tbody>
          {projection.map((row) => {
            const isDepleted =
              row.accountWithdrawals === 0 &&
              row.ssIncome + row.pensionIncome < row.totalIncome * 0.99;
            const isShortfall =
              row.accountWithdrawals === 0 &&
              row.ssIncome + row.pensionIncome > 0;

            return (
              <tr
                key={row.age}
                className={`border-b border-zinc-800/50 ${
                  isDepleted
                    ? "bg-red-500/5"
                    : "hover:bg-zinc-800/30"
                }`}
              >
                <td className="py-2.5 pr-3 font-medium text-zinc-200">
                  {row.age}
                </td>
                <td className="py-2.5 px-3 text-zinc-400">{row.year}</td>
                <td className="text-right py-2.5 px-3 text-blue-400">
                  {row.ssIncome > 0 ? formatCurrency(row.ssIncome) : "--"}
                </td>
                <td className="text-right py-2.5 px-3 text-purple-400">
                  {row.pensionIncome > 0
                    ? formatCurrency(row.pensionIncome)
                    : "--"}
                </td>
                <td
                  className={`text-right py-2.5 px-3 ${
                    row.accountWithdrawals > 0
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  }`}
                >
                  {row.accountWithdrawals > 0
                    ? formatCurrency(row.accountWithdrawals)
                    : isShortfall
                      ? "Depleted"
                      : "--"}
                </td>
                <td className="text-right py-2.5 px-3 text-zinc-200 font-medium">
                  {formatCurrency(row.totalIncome)}
                </td>
                <td className="text-right py-2.5 px-3 text-red-400/80">
                  {row.estimatedTaxes > 0
                    ? `-${formatCurrency(row.estimatedTaxes)}`
                    : "--"}
                </td>
                <td
                  className={`text-right py-2.5 pl-3 font-medium ${
                    row.netIncome > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(row.netIncome)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
