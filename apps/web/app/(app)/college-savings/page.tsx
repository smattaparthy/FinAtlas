"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import CollegeSavingsChart from "@/components/college/CollegeSavingsChart";
import {
  projectCollegeSavings,
  estimate529TaxBenefit,
  calculateSensitivity,
} from "@/lib/college/collegeSavingsCalculations";

export default function CollegeSavingsPage() {
  // --- Input state ---
  const [currentAge, setCurrentAge] = useState(5);
  const [enrollmentAge, setEnrollmentAge] = useState(18);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [monthlyContrib, setMonthlyContrib] = useState(500);
  const [expectedReturn, setExpectedReturn] = useState(6);
  const [annualCost, setAnnualCost] = useState(35000);
  const [costInflation, setCostInflation] = useState(5);
  const [stateTaxRate, setStateTaxRate] = useState(5);

  // --- Derived calculations ---
  const result = useMemo(
    () =>
      projectCollegeSavings(
        currentAge,
        enrollmentAge,
        currentSavings,
        monthlyContrib,
        expectedReturn / 100,
        annualCost,
        costInflation / 100
      ),
    [
      currentAge,
      enrollmentAge,
      currentSavings,
      monthlyContrib,
      expectedReturn,
      annualCost,
      costInflation,
    ]
  );

  const taxBenefit = useMemo(
    () => estimate529TaxBenefit(monthlyContrib * 12, stateTaxRate / 100),
    [monthlyContrib, stateTaxRate]
  );

  const sensitivity = useMemo(
    () =>
      calculateSensitivity(
        currentAge,
        enrollmentAge,
        currentSavings,
        monthlyContrib,
        expectedReturn / 100,
        annualCost,
        costInflation / 100
      ),
    [
      currentAge,
      enrollmentAge,
      currentSavings,
      monthlyContrib,
      expectedReturn,
      annualCost,
      costInflation,
    ]
  );

  const isSurplus = result.shortfall <= 0;
  const shortfallColor = isSurplus ? "text-emerald-400" : "text-red-400";
  const shortfallPrefix = isSurplus ? "+" : "-";
  const shortfallDisplay = Math.abs(result.shortfall);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">College Savings Calculator</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Model 529 plan growth, project costs, and calculate required
          contributions
        </p>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Child's Current Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Child&apos;s Current Age
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="17"
                step="1"
                value={currentAge}
                onChange={(e) => setCurrentAge(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {currentAge}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>0</span>
              <span>17</span>
            </div>
          </div>

          {/* Enrollment Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              College Enrollment Age
            </label>
            <select
              value={enrollmentAge}
              onChange={(e) => setEnrollmentAge(parseInt(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value={16}>16</option>
              <option value={17}>17</option>
              <option value={18}>18</option>
              <option value={19}>19</option>
            </select>
          </div>

          {/* Current 529 Savings */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Current 529 Savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={currentSavings || ""}
                onChange={(e) =>
                  setCurrentSavings(
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Monthly Contribution
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={monthlyContrib || ""}
                onChange={(e) =>
                  setMonthlyContrib(
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Expected Annual Return */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Expected Annual Return
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {expectedReturn}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>2%</span>
              <span>12%</span>
            </div>
          </div>

          {/* Annual College Cost */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Annual College Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={annualCost || ""}
                onChange={(e) =>
                  setAnnualCost(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cost Inflation Rate */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Cost Inflation Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="8"
                step="0.5"
                value={costInflation}
                onChange={(e) => setCostInflation(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {costInflation}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>2%</span>
              <span>8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Projected Savings at Enrollment */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">
            Projected Savings at Enrollment
          </div>
          <div className="text-xl font-semibold text-emerald-400">
            {formatCurrency(result.projectedSavingsAtEnrollment)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            At age {enrollmentAge} with {expectedReturn}% return
          </div>
        </div>

        {/* Estimated 4-Year Cost */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">
            Estimated 4-Year Cost
          </div>
          <div className="text-xl font-semibold">
            {formatCurrency(result.totalCostAt4Years)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Adjusted for {costInflation}% annual inflation
          </div>
        </div>

        {/* Surplus / Shortfall */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">
            {isSurplus ? "Surplus" : "Shortfall"}
          </div>
          <div className={`text-xl font-semibold ${shortfallColor}`}>
            {shortfallPrefix}
            {formatCurrency(shortfallDisplay)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {isSurplus
              ? "You are on track to exceed the goal"
              : "Additional savings needed to cover costs"}
          </div>
        </div>

        {/* Required Monthly Contribution */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">
            Required Monthly to Fully Fund
          </div>
          <div className="text-xl font-semibold text-emerald-400">
            {formatCurrency(result.requiredMonthlyContribution)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Monthly contribution needed to cover 4-year cost
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      {result.projectionPoints.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">
            Savings vs. Cost Projection
          </h2>
          <CollegeSavingsChart
            projectionPoints={result.projectionPoints}
            enrollmentAge={enrollmentAge}
            currentAge={currentAge}
          />
        </div>
      )}

      {/* 529 Tax Benefit */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          529 Tax Benefit Estimate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              State Tax Rate
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="15"
                step="0.5"
                value={stateTaxRate || ""}
                onChange={(e) =>
                  setStateTaxRate(
                    Math.max(0, Math.min(15, parseFloat(e.target.value) || 0))
                  )
                }
                placeholder="5"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                %
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1.5">
              Annual Contribution
            </div>
            <div className="text-lg font-semibold text-zinc-200">
              {formatCurrency(monthlyContrib * 12)}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {formatCurrency(monthlyContrib)} /mo x 12
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1.5">
              Estimated Annual Tax Savings
            </div>
            <div className="text-lg font-semibold text-emerald-400">
              {formatCurrency(taxBenefit)}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              Based on {stateTaxRate}% state deduction rate
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Sensitivity Analysis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4 font-medium">
                  Return Rate
                </th>
                <th className="text-right py-2 px-4 font-medium">
                  Projected Savings
                </th>
                <th className="text-right py-2 pl-4 font-medium">
                  Shortfall / Surplus
                </th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row, i) => {
                const isBase = i === 2;
                const rowSurplus = row.shortfall <= 0;
                return (
                  <tr
                    key={i}
                    className={`border-b border-zinc-800/50 ${
                      isBase ? "bg-zinc-900/40" : ""
                    }`}
                  >
                    <td className="py-2 pr-4">
                      <span
                        className={
                          isBase
                            ? "text-emerald-400 font-medium"
                            : "text-zinc-300"
                        }
                      >
                        {(row.returnRate * 100).toFixed(1)}%
                      </span>
                      {isBase && (
                        <span className="text-xs text-zinc-600 ml-2">
                          (selected)
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-4 text-zinc-200">
                      {formatCurrency(row.projectedSavings)}
                    </td>
                    <td
                      className={`text-right py-2 pl-4 font-medium ${
                        rowSurplus ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {rowSurplus ? "+" : "-"}
                      {formatCurrency(Math.abs(row.shortfall))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Section */}
      <div className="text-xs text-zinc-600 pb-4 space-y-2">
        <p>
          <strong className="text-zinc-500">About 529 Plans:</strong> A 529
          plan is a tax-advantaged savings plan designed to help pay for
          education. Contributions grow tax-free and withdrawals for qualified
          education expenses are not taxed at the federal level. Many states also
          offer tax deductions or credits for contributions.
        </p>
        <p>
          <strong className="text-zinc-500">Investment Returns:</strong>{" "}
          Projections assume a constant annual return rate. Actual returns will
          vary year to year. A diversified portfolio of stocks and bonds has
          historically returned 6-8% annually, though past performance does not
          guarantee future results.
        </p>
        <p>
          <strong className="text-zinc-500">Cost Inflation:</strong> College
          costs have historically risen 3-6% per year, outpacing general
          inflation. This calculator applies cost inflation to project future
          tuition expenses from today&apos;s annual cost figure.
        </p>
      </div>
    </div>
  );
}
