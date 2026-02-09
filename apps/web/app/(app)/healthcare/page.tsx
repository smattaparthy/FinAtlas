"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import HealthcareCostChart from "@/components/healthcare/HealthcareCostChart";
import HealthcareSummaryCards from "@/components/healthcare/HealthcareSummaryCards";
import {
  calculateHealthcareCosts,
  calculateSensitivity,
} from "@/lib/healthcare/healthcareCostCalculations";
import { calculateIRMAA, type FilingStatus } from "@/lib/healthcare/irmaaCalculations";

export default function HealthcarePage() {
  // Input state
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(62);
  const [medicareAge, setMedicareAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [currentAnnualPremium, setCurrentAnnualPremium] = useState(6000);
  const [annualDeductible, setAnnualDeductible] = useState(3000);
  const [annualOutOfPocket, setAnnualOutOfPocket] = useState(2000);
  const [hsaBalance, setHsaBalance] = useState(15000);
  const [hsaAnnualContribution, setHsaAnnualContribution] = useState(7000);
  const [healthcareInflation, setHealthcareInflation] = useState(6);
  const [generalInflation, setGeneralInflation] = useState(2.5);
  const [investmentReturn, setInvestmentReturn] = useState(7);

  // IRMAA calculator state
  const [retirementIncome, setRetirementIncome] = useState(80000);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('SINGLE');

  // Calculate healthcare costs
  const result = useMemo(
    () =>
      calculateHealthcareCosts({
        currentAge,
        retirementAge,
        medicareAge,
        lifeExpectancy,
        currentAnnualPremium,
        annualDeductible,
        annualOutOfPocket,
        hsaBalance,
        hsaAnnualContribution,
        healthcareInflation: healthcareInflation / 100,
        generalInflation: generalInflation / 100,
        investmentReturn: investmentReturn / 100,
      }),
    [
      currentAge,
      retirementAge,
      medicareAge,
      lifeExpectancy,
      currentAnnualPremium,
      annualDeductible,
      annualOutOfPocket,
      hsaBalance,
      hsaAnnualContribution,
      healthcareInflation,
      generalInflation,
      investmentReturn,
    ]
  );

  // Calculate IRMAA
  const irmaaResult = useMemo(
    () => calculateIRMAA(retirementIncome, filingStatus),
    [retirementIncome, filingStatus]
  );

  // Sensitivity analysis
  const inflationSensitivity = useMemo(
    () =>
      calculateSensitivity(
        {
          currentAge,
          retirementAge,
          medicareAge,
          lifeExpectancy,
          currentAnnualPremium,
          annualDeductible,
          annualOutOfPocket,
          hsaBalance,
          hsaAnnualContribution,
          healthcareInflation: healthcareInflation / 100,
          generalInflation: generalInflation / 100,
          investmentReturn: investmentReturn / 100,
        },
        'healthcareInflation',
        [0.04, 0.05, 0.06, 0.07, 0.08]
      ),
    [
      currentAge,
      retirementAge,
      medicareAge,
      lifeExpectancy,
      currentAnnualPremium,
      annualDeductible,
      annualOutOfPocket,
      hsaBalance,
      hsaAnnualContribution,
      healthcareInflation,
      generalInflation,
      investmentReturn,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Healthcare Cost Modeling</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Project lifetime healthcare costs across working years, early retirement, and Medicare
        </p>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Current Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Current Age</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="18"
                max="70"
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
              <span>18</span>
              <span>70</span>
            </div>
          </div>

          {/* Retirement Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Retirement Age</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="70"
                step="1"
                value={retirementAge}
                onChange={(e) => setRetirementAge(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {retirementAge}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>50</span>
              <span>70</span>
            </div>
          </div>

          {/* Life Expectancy */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Life Expectancy</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="70"
                max="100"
                step="1"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {lifeExpectancy}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>70</span>
              <span>100</span>
            </div>
          </div>

          {/* Current Annual Premium */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Current Annual Premium
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="500"
                value={currentAnnualPremium || ""}
                onChange={(e) => setCurrentAnnualPremium(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Annual Out-of-Pocket */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Annual Out-of-Pocket
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="500"
                value={annualOutOfPocket || ""}
                onChange={(e) => setAnnualOutOfPocket(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* HSA Balance */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Current HSA Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={hsaBalance || ""}
                onChange={(e) => setHsaBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* HSA Annual Contribution */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              HSA Annual Contribution
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="500"
                value={hsaAnnualContribution || ""}
                onChange={(e) => setHsaAnnualContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Healthcare Inflation */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Healthcare Inflation Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="10"
                step="0.5"
                value={healthcareInflation}
                onChange={(e) => setHealthcareInflation(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {healthcareInflation}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>3%</span>
              <span>10%</span>
            </div>
          </div>

          {/* HSA Investment Return */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              HSA Investment Return
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={investmentReturn}
                onChange={(e) => setInvestmentReturn(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {investmentReturn}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>3%</span>
              <span>12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <HealthcareSummaryCards result={result} />

      {/* Projection Chart */}
      {result.projections.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Healthcare Cost Projection</h2>
          <HealthcareCostChart projections={result.projections} />
        </div>
      )}

      {/* Cost Breakdown by Phase */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Cost Breakdown by Phase</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pre-Retirement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Pre-Retirement</span>
              <span className="text-xs text-zinc-500">
                Age {currentAge}-{retirementAge}
              </span>
            </div>
            <div className="text-lg font-semibold text-emerald-400">
              {formatCurrency(result.preRetirementCost)}
            </div>
            <div className="text-xs text-zinc-600">
              Employer-subsidized coverage with HSA contributions
            </div>
          </div>

          {/* Early Retirement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Early Retirement</span>
              <span className="text-xs text-zinc-500">
                Age {retirementAge}-{medicareAge}
              </span>
            </div>
            <div className="text-lg font-semibold text-amber-400">
              {formatCurrency(result.earlyRetirementCost)}
            </div>
            <div className="text-xs text-zinc-600">
              COBRA then ACA marketplace - highest cost phase
            </div>
          </div>

          {/* Medicare */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Medicare</span>
              <span className="text-xs text-zinc-500">
                Age {medicareAge}+
              </span>
            </div>
            <div className="text-lg font-semibold text-blue-400">
              {formatCurrency(result.medicareCost)}
            </div>
            <div className="text-xs text-zinc-600">
              Part B + Part D + Medigap with IRMAA considerations
            </div>
          </div>
        </div>
      </div>

      {/* IRMAA Calculator */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Medicare IRMAA Calculator
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Income-Related Monthly Adjustment Amount - higher earners pay surcharges on Medicare Part B and Part D
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Retirement Income Input */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Retirement Annual Income (MAGI)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="5000"
                value={retirementIncome || ""}
                onChange={(e) => setRetirementIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Filing Status */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Filing Status</label>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value="SINGLE">Single</option>
              <option value="MFJ">Married Filing Jointly</option>
            </select>
          </div>

          {/* Total Annual Surcharge */}
          <div>
            <div className="text-xs text-zinc-400 mb-1.5">Total Annual Surcharge</div>
            <div className="text-lg font-semibold text-red-400">
              {irmaaResult.totalAnnualSurcharge > 0
                ? `+${formatCurrency(irmaaResult.totalAnnualSurcharge)}`
                : 'No surcharge'}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              {irmaaResult.bracketDescription}
            </div>
          </div>
        </div>

        {/* IRMAA Breakdown */}
        {irmaaResult.totalAnnualSurcharge > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Part B Monthly</div>
              <div className="text-base font-semibold">
                {formatCurrency(irmaaResult.totalPartBMonthly)}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                Base ${174.70} + ${irmaaResult.partBSurcharge.toFixed(2)} surcharge
              </div>
            </div>
            <div className="border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Part D Surcharge</div>
              <div className="text-base font-semibold">
                +{formatCurrency(irmaaResult.partDSurcharge)}/mo
              </div>
              <div className="text-xs text-zinc-600 mt-1">Added to plan premium</div>
            </div>
            <div className="border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 mb-1">Total Monthly Impact</div>
              <div className="text-base font-semibold text-red-400">
                +{formatCurrency(irmaaResult.totalMonthlySurcharge)}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                {formatCurrency(irmaaResult.totalAnnualSurcharge)}/year
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sensitivity Analysis */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Healthcare Inflation Sensitivity
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4 font-medium">Inflation Rate</th>
                <th className="text-right py-2 px-4 font-medium">Total Lifetime Cost</th>
                <th className="text-right py-2 pl-4 font-medium">HSA Coverage Years</th>
              </tr>
            </thead>
            <tbody>
              {inflationSensitivity.map((row, i) => {
                const isBase = row.value === healthcareInflation / 100;
                return (
                  <tr
                    key={i}
                    className={`border-b border-zinc-800/50 ${
                      isBase ? 'bg-zinc-900/40' : ''
                    }`}
                  >
                    <td className="py-2 pr-4">
                      <span
                        className={
                          isBase ? 'text-emerald-400 font-medium' : 'text-zinc-300'
                        }
                      >
                        {(row.value * 100).toFixed(1)}%
                      </span>
                      {isBase && (
                        <span className="text-xs text-zinc-600 ml-2">(selected)</span>
                      )}
                    </td>
                    <td className="text-right py-2 px-4 text-zinc-200">
                      {formatCurrency(row.totalCost)}
                    </td>
                    <td className="text-right py-2 pl-4 text-zinc-200">
                      {row.hsaCoverageYears} years
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Healthcare Planning Tips</h2>
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-300">Maximize HSA contributions:</strong> HSAs offer triple tax advantages - contributions are tax-deductible, growth is tax-free, and qualified withdrawals are tax-free. Max contribution for 2024 is $8,300 for families.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-300">Plan for the coverage gap:</strong> Healthcare costs between retirement and Medicare eligibility (age 65) are typically the highest. COBRA lasts 18 months, then you'll need ACA marketplace coverage.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-300">Consider Roth conversions:</strong> Lower your Modified Adjusted Gross Income (MAGI) to avoid or reduce IRMAA surcharges. IRMAA is based on income from two years prior.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-300">Shop ACA marketplace carefully:</strong> Plans vary significantly in premiums, deductibles, and networks. Consider silver plans for better cost-sharing reductions if income-eligible.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-300">Review Medigap options:</strong> Original Medicare covers about 80% of costs. Medigap or Medicare Advantage plans help cover the gaps. Enroll during your initial enrollment period to avoid medical underwriting.
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="text-xs text-zinc-600 pb-4 space-y-2">
        <p>
          <strong className="text-zinc-500">About Healthcare Costs:</strong> Healthcare costs historically increase 5-7% annually, faster than general inflation. This calculator models three distinct phases with different cost structures.
        </p>
        <p>
          <strong className="text-zinc-500">Assumptions:</strong> Pre-retirement assumes employer-subsidized coverage. Early retirement uses ACA marketplace rates for ages 60-64. Medicare phase includes Part B, Part D, and Medigap premiums plus typical out-of-pocket costs. Actual costs vary based on health status, location, and plan choices.
        </p>
      </div>
    </div>
  );
}
