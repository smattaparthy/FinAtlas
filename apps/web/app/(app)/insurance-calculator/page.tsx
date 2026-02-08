"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import {
  calculateLifeInsuranceNeed,
  calculateDisabilityInsuranceNeed,
  type LifeInsuranceResult,
  type DisabilityInsuranceResult,
} from "@/lib/insurance/insuranceCalculations";
import CoverageBreakdownChart from "@/components/insurance/CoverageBreakdownChart";

type Tab = "life" | "disability";

export default function InsuranceCalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("life");

  // Shared state
  const [annualIncome, setAnnualIncome] = useState(75000);

  // Life insurance inputs
  const [yearsToReplace, setYearsToReplace] = useState(15);
  const [outstandingDebts, setOutstandingDebts] = useState(200000);
  const [educationPerChild, setEducationPerChild] = useState(100000);
  const [numberOfChildren, setNumberOfChildren] = useState(2);
  const [finalExpenses, setFinalExpenses] = useState(15000);
  const [existingCoverage, setExistingCoverage] = useState(0);
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);

  // Disability insurance inputs
  const [monthlyEssentialExpenses, setMonthlyEssentialExpenses] = useState(4000);
  const [employerCoveragePct, setEmployerCoveragePct] = useState(0);
  const [existingDisabilityCoverage, setExistingDisabilityCoverage] = useState(0);

  // Calculations
  const lifeResult: LifeInsuranceResult = useMemo(
    () =>
      calculateLifeInsuranceNeed({
        annualIncome,
        yearsToReplace,
        outstandingDebts,
        educationPerChild,
        numberOfChildren,
        finalExpenses,
        existingCoverage,
        currentAge,
        retirementAge,
      }),
    [
      annualIncome,
      yearsToReplace,
      outstandingDebts,
      educationPerChild,
      numberOfChildren,
      finalExpenses,
      existingCoverage,
      currentAge,
      retirementAge,
    ]
  );

  const disabilityResult: DisabilityInsuranceResult = useMemo(
    () =>
      calculateDisabilityInsuranceNeed({
        annualIncome,
        monthlyEssentialExpenses,
        employerCoveragePct,
        existingDisabilityCoverage,
      }),
    [annualIncome, monthlyEssentialExpenses, employerCoveragePct, existingDisabilityCoverage]
  );

  function getGapColor(gap: number, recommended: number): string {
    if (gap <= 0) return "text-emerald-400";
    if (gap < recommended * 0.2) return "text-amber-400";
    return "text-red-400";
  }

  function getGapLabel(gap: number): string {
    if (gap <= 0) return "Fully covered";
    return `Under-insured by ${formatCurrency(gap)}`;
  }

  function getGapBorderColor(gap: number, recommended: number): string {
    if (gap <= 0) return "border-emerald-500/30";
    if (gap < recommended * 0.2) return "border-amber-500/30";
    return "border-red-500/30";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">
          Insurance Needs Calculator
        </h1>
        <p className="mt-2 text-zinc-400">
          Analyze your life and disability insurance coverage to identify gaps and
          ensure adequate protection for your family.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("life")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "life"
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Life Insurance
          </button>
          <button
            onClick={() => setActiveTab("disability")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "disability"
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Disability Insurance
          </button>
        </div>
      </div>

      {/* Life Insurance Tab */}
      {activeTab === "life" && (
        <div className="space-y-6">
          {/* Input Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">
              Your Information
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Annual Income */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Annual Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={annualIncome || ""}
                    onChange={(e) =>
                      setAnnualIncome(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Years to Replace Income */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-zinc-400">
                    Years to Replace Income
                  </label>
                  <span className="text-xs font-semibold text-emerald-400">
                    {yearsToReplace} years
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={yearsToReplace}
                  onChange={(e) => setYearsToReplace(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-600">
                  <span>5</span>
                  <span>30</span>
                </div>
              </div>

              {/* Outstanding Debts */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Outstanding Debts (mortgage, car, student loans)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={outstandingDebts || ""}
                    onChange={(e) =>
                      setOutstandingDebts(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Education Fund per Child */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Education Fund per Child
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={educationPerChild || ""}
                    onChange={(e) =>
                      setEducationPerChild(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Number of Children */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Number of Children
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={numberOfChildren}
                  onChange={(e) =>
                    setNumberOfChildren(
                      Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Final Expenses */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Final Expenses (funeral, medical, legal)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={finalExpenses || ""}
                    onChange={(e) =>
                      setFinalExpenses(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Existing Life Insurance */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Existing Life Insurance Coverage
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={existingCoverage || ""}
                    onChange={(e) =>
                      setExistingCoverage(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Current Age */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Current Age
                </label>
                <input
                  type="number"
                  min="18"
                  max="80"
                  step="1"
                  value={currentAge}
                  onChange={(e) =>
                    setCurrentAge(
                      Math.max(18, Math.min(80, parseInt(e.target.value) || 18))
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Retirement Age */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Retirement Age
                </label>
                <input
                  type="number"
                  min="50"
                  max="80"
                  step="1"
                  value={retirementAge}
                  onChange={(e) =>
                    setRetirementAge(
                      Math.max(50, Math.min(80, parseInt(e.target.value) || 65))
                    )
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Recommended Coverage
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-50">
                {formatCurrency(lifeResult.totalRecommended)}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Total need based on your inputs
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Current Coverage
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-50">
                {formatCurrency(lifeResult.existingCoverage)}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Existing life insurance
              </div>
            </div>

            <div
              className={`rounded-2xl border bg-zinc-950/60 p-5 ${getGapBorderColor(
                lifeResult.coverageGap,
                lifeResult.totalRecommended
              )}`}
            >
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Coverage Gap
              </div>
              <div
                className={`mt-2 text-2xl font-bold ${getGapColor(
                  lifeResult.coverageGap,
                  lifeResult.totalRecommended
                )}`}
              >
                {lifeResult.coverageGap > 0
                  ? formatCurrency(lifeResult.coverageGap)
                  : formatCurrency(Math.abs(lifeResult.coverageGap))}
              </div>
              <div
                className={`mt-1 text-xs ${getGapColor(
                  lifeResult.coverageGap,
                  lifeResult.totalRecommended
                )}`}
              >
                {getGapLabel(lifeResult.coverageGap)}
              </div>
            </div>
          </div>

          {/* Coverage Breakdown Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <CoverageBreakdownChart
              breakdown={lifeResult.breakdown}
              existingCoverage={lifeResult.existingCoverage}
              totalRecommended={lifeResult.totalRecommended}
            />
          </div>

          {/* Suggested Term */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h3 className="mb-2 text-sm font-medium text-zinc-300">
              Suggested Term Length
            </h3>
            <p className="text-zinc-300">
              Based on your age ({currentAge}) and retirement plans (age{" "}
              {retirementAge}), a{" "}
              <span className="font-semibold text-emerald-400">
                {lifeResult.suggestedTermYears}-year
              </span>{" "}
              term policy is recommended. This covers you until your investments
              and retirement savings can replace the need for life insurance.
            </p>
          </div>

          {/* Breakdown Details */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h3 className="mb-4 text-sm font-medium text-zinc-300">
              Needs Breakdown
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Income Replacement",
                  amount: lifeResult.incomeReplacement,
                  description: `${yearsToReplace} years of annual income to maintain your family's standard of living`,
                },
                {
                  label: "Debt Coverage",
                  amount: lifeResult.debtCoverage,
                  description:
                    "Pay off mortgage, auto loans, student loans, and other outstanding debts",
                },
                {
                  label: "Education Fund",
                  amount: lifeResult.educationFund,
                  description: `${formatCurrency(educationPerChild)} per child for ${numberOfChildren} ${numberOfChildren === 1 ? "child" : "children"}`,
                },
                {
                  label: "Final Expenses",
                  amount: lifeResult.finalExpenses,
                  description:
                    "Funeral costs, medical bills, estate settlement, and legal fees",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-xl bg-zinc-900/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200">
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {item.description}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-sm font-semibold text-zinc-200">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <span className="text-sm font-semibold text-zinc-200">
                  Total Recommended
                </span>
                <span className="text-lg font-bold text-zinc-50">
                  {formatCurrency(lifeResult.totalRecommended)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disability Insurance Tab */}
      {activeTab === "disability" && (
        <div className="space-y-6">
          {/* Input Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">
              Your Information
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Annual Income (shared) */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Annual Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={annualIncome || ""}
                    onChange={(e) =>
                      setAnnualIncome(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Monthly Essential Expenses */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Monthly Essential Expenses
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyEssentialExpenses || ""}
                    onChange={(e) =>
                      setMonthlyEssentialExpenses(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Employer Coverage */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-zinc-400">
                    Employer Disability Coverage
                  </label>
                  <span className="text-xs font-semibold text-emerald-400">
                    {employerCoveragePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={employerCoveragePct}
                  onChange={(e) => setEmployerCoveragePct(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-600">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Existing Private Disability */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  Existing Private Disability Coverage ($/month)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={existingDisabilityCoverage || ""}
                    onChange={(e) =>
                      setExistingDisabilityCoverage(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-50 transition-colors focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Recommended Monthly Benefit
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-50">
                {formatCurrency(disabilityResult.recommendedMonthlyBenefit)}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                65% of gross monthly income
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Current Monthly Benefit
              </div>
              <div className="mt-2 text-2xl font-bold text-zinc-50">
                {formatCurrency(disabilityResult.currentMonthlyBenefit)}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Employer + private coverage
              </div>
            </div>

            <div
              className={`rounded-2xl border bg-zinc-950/60 p-5 ${getGapBorderColor(
                disabilityResult.coverageGap,
                disabilityResult.recommendedMonthlyBenefit
              )}`}
            >
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Monthly Gap
              </div>
              <div
                className={`mt-2 text-2xl font-bold ${getGapColor(
                  disabilityResult.coverageGap,
                  disabilityResult.recommendedMonthlyBenefit
                )}`}
              >
                {disabilityResult.coverageGap > 0
                  ? formatCurrency(disabilityResult.coverageGap)
                  : formatCurrency(Math.abs(disabilityResult.coverageGap))}
              </div>
              <div
                className={`mt-1 text-xs ${getGapColor(
                  disabilityResult.coverageGap,
                  disabilityResult.recommendedMonthlyBenefit
                )}`}
              >
                {disabilityResult.coverageGap <= 0
                  ? "Fully covered"
                  : `${formatCurrency(disabilityResult.coverageGap)}/mo shortfall`}
              </div>
            </div>
          </div>

          {/* Coverage Ratio Progress Bar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h3 className="mb-3 text-sm font-medium text-zinc-300">
              Expense Coverage Ratio
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Current benefit vs. essential expenses
                </span>
                <span
                  className={
                    disabilityResult.coverageRatio >= 80
                      ? "text-emerald-400"
                      : disabilityResult.coverageRatio >= 50
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {disabilityResult.coverageRatio.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    disabilityResult.coverageRatio >= 80
                      ? "bg-emerald-500"
                      : disabilityResult.coverageRatio >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(disabilityResult.coverageRatio, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-600">
                <span>$0</span>
                <span>
                  {formatCurrency(disabilityResult.essentialMonthlyExpenses)}/mo
                  expenses
                </span>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                Short-term vs Long-term
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-300">Short-term disability</span>{" "}
                covers the first 3-6 months after illness or injury.{" "}
                <span className="font-medium text-zinc-300">Long-term disability</span>{" "}
                kicks in after the elimination period and can pay benefits for years
                or until retirement age.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                Elimination Periods
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                The waiting period before benefits begin. Common options:{" "}
                <span className="font-medium text-zinc-300">30 days</span> (highest
                premium),{" "}
                <span className="font-medium text-zinc-300">60 days</span>,{" "}
                <span className="font-medium text-zinc-300">90 days</span> (most
                common), or{" "}
                <span className="font-medium text-zinc-300">180 days</span> (lowest
                premium). A longer period lowers your premium.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                Benefit Periods
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                How long benefits are paid:{" "}
                <span className="font-medium text-zinc-300">2 years</span> (short
                disabilities),{" "}
                <span className="font-medium text-zinc-300">5 years</span> (moderate
                coverage), or{" "}
                <span className="font-medium text-zinc-300">to age 65</span>{" "}
                (comprehensive, recommended for high earners). Longer benefit periods
                cost more but provide better protection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Methodology Note */}
      <div className="pb-4 text-xs text-zinc-600">
        Insurance needs are estimates based on the DIME method (Debt, Income,
        Mortgage, Education). Disability benefit recommendations follow the
        industry standard of 60-70% income replacement. Consult a licensed insurance
        professional for personalized advice.
      </div>
    </div>
  );
}
