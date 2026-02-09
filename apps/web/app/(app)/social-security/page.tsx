"use client";

import { useState, useMemo } from "react";
import SSComparisonChart from "@/components/social-security/SSComparisonChart";
import SSResultsTable from "@/components/social-security/SSResultsTable";
import { formatCurrency } from "@/lib/format";
import {
  optimizeSSClaiming,
  type SSOptimizationResult,
} from "@/lib/social-security/ssOptimization";

export default function SocialSecurityPage() {
  const currentYear = new Date().getFullYear();

  // Primary inputs
  const [birthYear, setBirthYear] = useState(1960);
  const [currentAge, setCurrentAge] = useState(currentYear - birthYear);
  const [pia, setPia] = useState(2500);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [discountRate, setDiscountRate] = useState(3);

  // Spouse inputs
  const [includeSpouse, setIncludeSpouse] = useState(false);
  const [spouseBirthYear, setSpouseBirthYear] = useState(1962);
  const [spousePia, setSpousePia] = useState(1800);

  // Update current age when birth year changes
  const handleBirthYearChange = (year: number) => {
    setBirthYear(year);
    setCurrentAge(currentYear - year);
  };

  const handleSpouseBirthYearChange = (year: number) => {
    setSpouseBirthYear(year);
  };

  // Calculate full retirement age based on birth year
  const fullRetirementAge = useMemo(() => {
    if (birthYear <= 1937) return 65;
    if (birthYear >= 1960) return 67;
    // Gradual increase from 65 to 67 between 1938-1959
    return 66;
  }, [birthYear]);

  // Optimize SS claiming
  const result: SSOptimizationResult = useMemo(() => {
    return optimizeSSClaiming({
      birthYear,
      fullRetirementAge,
      primaryInsuranceAmount: pia,
      currentAge,
      lifeExpectancy,
      discountRate: discountRate / 100,
      spouseInfo: includeSpouse
        ? {
            birthYear: spouseBirthYear,
            pia: spousePia,
            currentAge: currentYear - spouseBirthYear,
          }
        : undefined,
    });
  }, [
    birthYear,
    fullRetirementAge,
    pia,
    currentAge,
    lifeExpectancy,
    discountRate,
    includeSpouse,
    spouseBirthYear,
    spousePia,
    currentYear,
  ]);

  const optimalScenario = result.scenarios.find(
    (s) => s.claimAge === result.optimalClaimAge
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Social Security Optimizer</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Calculate the optimal age to claim Social Security benefits
        </p>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Your Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Birth Year */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Birth Year
            </label>
            <input
              type="number"
              min="1940"
              max="2010"
              value={birthYear || ""}
              onChange={(e) =>
                handleBirthYearChange(
                  Math.max(1940, Math.min(2010, parseInt(e.target.value) || 1960))
                )
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <div className="text-xs text-zinc-500 mt-1">
              Current age: {currentAge} • FRA: {fullRetirementAge}
            </div>
          </div>

          {/* Primary Insurance Amount */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Monthly Benefit at FRA (PIA)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={pia || ""}
                onChange={(e) => setPia(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="2500"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            <a
              href="https://www.ssa.gov/myaccount/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-block"
            >
              Get estimate from SSA.gov →
            </a>
          </div>

          {/* Life Expectancy */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Life Expectancy
            </label>
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
              <span className="text-sm font-medium text-zinc-200 w-10 text-right">
                {lifeExpectancy}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>70</span>
              <span>100</span>
            </div>
          </div>

          {/* Discount Rate */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Discount Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="7"
                step="0.5"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {discountRate}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>0%</span>
              <span>7%</span>
            </div>
          </div>
        </div>

        {/* Spouse Toggle */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSpouse}
              onChange={(e) => setIncludeSpouse(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-zinc-300">
              Include Spouse for Joint Optimization
            </span>
          </label>

          {includeSpouse && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Spouse Birth Year */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Spouse Birth Year
                </label>
                <input
                  type="number"
                  min="1940"
                  max="2010"
                  value={spouseBirthYear || ""}
                  onChange={(e) =>
                    handleSpouseBirthYearChange(
                      Math.max(1940, Math.min(2010, parseInt(e.target.value) || 1962))
                    )
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <div className="text-xs text-zinc-500 mt-1">
                  Current age: {currentYear - spouseBirthYear}
                </div>
              </div>

              {/* Spouse PIA */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Spouse Monthly Benefit at FRA
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={spousePia || ""}
                    onChange={(e) =>
                      setSpousePia(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    placeholder="1800"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Optimal Claim Age */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Optimal Claim Age</div>
          <div className="text-3xl font-semibold text-emerald-400">
            {result.optimalClaimAge}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Maximizes lifetime benefits
          </div>
        </div>

        {/* Optimal Monthly Benefit */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Monthly at Optimal Age</div>
          <div className="text-xl font-semibold">
            {optimalScenario && formatCurrency(optimalScenario.monthlyBenefit)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {optimalScenario && formatCurrency(optimalScenario.monthlyBenefit * 12)}/year
          </div>
        </div>

        {/* Maximum Lifetime Benefit */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Lifetime Benefits</div>
          <div className="text-xl font-semibold text-emerald-400">
            {formatCurrency(result.maxLifetimeBenefit)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Through age {lifeExpectancy}
          </div>
        </div>
      </div>

      {/* Recommendation Card */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-emerald-400 mb-2">
              Recommendation
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {result.optimalClaimAge === 62 && (
                <>
                  Based on your life expectancy of {lifeExpectancy}, claiming early at age{" "}
                  <span className="font-semibold text-emerald-400">62</span> maximizes
                  your total lifetime benefits. While your monthly benefit will be reduced,
                  you&apos;ll receive payments for more years, resulting in{" "}
                  <span className="font-semibold">
                    {formatCurrency(result.maxLifetimeBenefit)}
                  </span>{" "}
                  in total benefits.
                </>
              )}
              {result.optimalClaimAge === 67 && (
                <>
                  Claiming at your Full Retirement Age of{" "}
                  <span className="font-semibold text-emerald-400">67</span> balances
                  monthly benefit amount with years of collection. Based on your life
                  expectancy of {lifeExpectancy}, this provides{" "}
                  <span className="font-semibold">
                    {formatCurrency(result.maxLifetimeBenefit)}
                  </span>{" "}
                  in total benefits without early reduction penalties.
                </>
              )}
              {result.optimalClaimAge === 70 && (
                <>
                  Delaying until age{" "}
                  <span className="font-semibold text-emerald-400">70</span> maximizes your
                  monthly benefit through delayed retirement credits (8% per year after
                  FRA). Based on your life expectancy of {lifeExpectancy}, this strategy
                  provides{" "}
                  <span className="font-semibold">
                    {formatCurrency(result.maxLifetimeBenefit)}
                  </span>{" "}
                  in total benefits.
                </>
              )}
              {result.optimalClaimAge !== 62 &&
                result.optimalClaimAge !== 67 &&
                result.optimalClaimAge !== 70 && (
                  <>
                    Based on your life expectancy of {lifeExpectancy}, claiming at age{" "}
                    <span className="font-semibold text-emerald-400">
                      {result.optimalClaimAge}
                    </span>{" "}
                    optimizes the balance between monthly benefit amount and years of
                    collection, providing{" "}
                    <span className="font-semibold">
                      {formatCurrency(result.maxLifetimeBenefit)}
                    </span>{" "}
                    in total benefits.
                  </>
                )}
            </p>
          </div>
        </div>
      </div>

      {/* Spousal Analysis */}
      {result.spousalAnalysis && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-3">Married Couple Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Higher Earner Claims At</div>
              <div className="text-2xl font-semibold text-emerald-400">
                Age {result.spousalAnalysis.optimalHigherEarnerAge}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Lower Earner Claims At</div>
              <div className="text-2xl font-semibold text-emerald-400">
                Age {result.spousalAnalysis.optimalLowerEarnerAge}
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1">Combined Lifetime Benefits</div>
            <div className="text-xl font-semibold">
              {formatCurrency(result.spousalAnalysis.totalLifetimeBenefit)}
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              {result.spousalAnalysis.strategy}
            </p>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-medium mb-4">Claiming Age Comparison</h2>
        <SSComparisonChart
          scenarios={result.scenarios}
          optimalClaimAge={result.optimalClaimAge}
          height={300}
        />
      </div>

      {/* Detailed Results Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-medium mb-4">Detailed Comparison by Age</h2>
        <SSResultsTable
          scenarios={result.scenarios}
          optimalClaimAge={result.optimalClaimAge}
        />
      </div>

      {/* Important Considerations */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">
          Important Considerations
        </h3>
        <ul className="space-y-2 text-xs text-zinc-300">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>
              This calculator assumes you live exactly to your life expectancy. Actual
              longevity varies significantly.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>
              Break-even analysis shows when delaying pays off vs. claiming at 67. Values
              below your life expectancy favor delaying.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>
              NPV (Net Present Value) accounts for time value of money. Lower discount
              rates favor delaying claiming.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>
              Other factors to consider: current financial need, other retirement income,
              health status, spousal/survivor benefits, and continued work earnings.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            <span>
              This is for educational purposes only. Consult a financial advisor for
              personalized advice.
            </span>
          </li>
        </ul>
      </div>

      {/* Methodology Note */}
      <div className="text-xs text-zinc-600 pb-4">
        Calculations use SSA rules: 6.67% annual reduction for first 3 years before FRA,
        5% thereafter; 8% annual delayed retirement credits up to age 70. Full Retirement
        Age varies by birth year (67 for those born 1960+). Spousal analysis uses
        simplified heuristics for joint optimization.
      </div>
    </div>
  );
}
