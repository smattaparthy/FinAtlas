"use client";

import { useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  analyzeRothConversion,
  analyzeTaxLossHarvesting,
  analyzeCapitalGains,
  projectMultiYearTax,
  type RothConversionInput,
  type TaxLossHarvestInput,
  type CapitalGainsInput,
  type MultiYearTaxInput,
} from "@/lib/tax/taxOptimization";
import RothConversionChart from "@/components/tax/RothConversionChart";
import TaxProjectionChart from "@/components/tax/TaxProjectionChart";
import TaxLossTable from "@/components/tax/TaxLossTable";

type Tab = "roth" | "harvest" | "gains" | "projection";

export default function TaxStrategyPage() {
  const [activeTab, setActiveTab] = useState<Tab>("roth");

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl font-bold text-zinc-50">Tax Strategy</h1>
      <p className="mb-8 text-zinc-400">
        Optimize your tax strategy with advanced planning tools
      </p>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("roth")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "roth"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Roth Conversion
        </button>
        <button
          onClick={() => setActiveTab("harvest")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "harvest"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Tax-Loss Harvesting
        </button>
        <button
          onClick={() => setActiveTab("gains")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "gains"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Capital Gains
        </button>
        <button
          onClick={() => setActiveTab("projection")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "projection"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Multi-Year Projection
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "roth" && <RothConversionTab />}
      {activeTab === "harvest" && <TaxLossHarvestingTab />}
      {activeTab === "gains" && <CapitalGainsTab />}
      {activeTab === "projection" && <MultiYearProjectionTab />}

      {/* Disclaimer */}
      <div className="mt-8 rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
        <p className="text-sm text-amber-200">
          These are strategic estimates for planning purposes. Tax laws are
          complex and individual circumstances vary. Consult a qualified tax
          professional or CPA for personalized advice.
        </p>
      </div>
    </div>
  );
}

// ============== ROTH CONVERSION TAB ==============

function RothConversionTab() {
  const [input, setInput] = useState<RothConversionInput>({
    traditionalIRABalance: 500000,
    currentAge: 55,
    retirementAge: 65,
    currentTaxBracket: 0.24,
    expectedRetirementBracket: 0.12,
    yearsToConvert: 5,
    annualConversionLimit: undefined,
  });

  const result = analyzeRothConversion(input);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Conversion Parameters
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Traditional IRA Balance
            </label>
            <input
              type="number"
              value={input.traditionalIRABalance}
              onChange={(e) =>
                setInput({
                  ...input,
                  traditionalIRABalance: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Current Age
            </label>
            <input
              type="number"
              value={input.currentAge}
              onChange={(e) =>
                setInput({ ...input, currentAge: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Retirement Age
            </label>
            <input
              type="number"
              value={input.retirementAge}
              onChange={(e) =>
                setInput({ ...input, retirementAge: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Current Tax Bracket
            </label>
            <select
              value={input.currentTaxBracket}
              onChange={(e) =>
                setInput({
                  ...input,
                  currentTaxBracket: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value={0.1}>10%</option>
              <option value={0.12}>12%</option>
              <option value={0.22}>22%</option>
              <option value={0.24}>24%</option>
              <option value={0.32}>32%</option>
              <option value={0.35}>35%</option>
              <option value={0.37}>37%</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Expected Retirement Bracket
            </label>
            <select
              value={input.expectedRetirementBracket}
              onChange={(e) =>
                setInput({
                  ...input,
                  expectedRetirementBracket: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value={0.1}>10%</option>
              <option value={0.12}>12%</option>
              <option value={0.22}>22%</option>
              <option value={0.24}>24%</option>
              <option value={0.32}>32%</option>
              <option value={0.35}>35%</option>
              <option value={0.37}>37%</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Years to Convert
            </label>
            <input
              type="number"
              value={input.yearsToConvert}
              onChange={(e) =>
                setInput({ ...input, yearsToConvert: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Total Tax Paid</div>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(result.totalTaxPaid)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Tax Saved in Retirement</div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(result.taxSavedInRetirement)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Net Benefit</div>
          <div
            className={`text-2xl font-bold ${result.netBenefit >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(result.netBenefit)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Break-Even Age</div>
          <div className="text-2xl font-bold text-zinc-50">
            {result.breakEvenAge}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Balance Trajectory
        </h2>
        <RothConversionChart data={result.yearByYear} />
      </div>

      {/* Recommendation */}
      <div
        className={`rounded-2xl border p-5 ${
          result.netBenefit >= 0
            ? "border-emerald-800 bg-emerald-950/30"
            : "border-amber-800 bg-amber-950/30"
        }`}
      >
        <h3 className="mb-2 font-bold text-zinc-50">Recommendation</h3>
        <p
          className={
            result.netBenefit >= 0 ? "text-emerald-200" : "text-amber-200"
          }
        >
          {result.recommendation}
        </p>
      </div>
    </div>
  );
}

// ============== TAX-LOSS HARVESTING TAB ==============

function TaxLossHarvestingTab() {
  const [holdings, setHoldings] = useState<
    TaxLossHarvestInput["holdings"]
  >([
    {
      symbol: "AAPL",
      shares: 100,
      costBasis: 18000,
      currentValue: 17000,
      holdingPeriod: "LONG",
    },
    {
      symbol: "TSLA",
      shares: 50,
      costBasis: 15000,
      currentValue: 12000,
      holdingPeriod: "SHORT",
    },
    {
      symbol: "NVDA",
      shares: 200,
      costBasis: 50000,
      currentValue: 48000,
      holdingPeriod: "LONG",
    },
  ]);

  const [realizedGains, setRealizedGains] = useState(10000);
  const [taxBracket, setTaxBracket] = useState(0.24);

  const result = analyzeTaxLossHarvesting({
    holdings,
    realizedGains,
    taxBracket,
  });

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Portfolio Parameters
        </h2>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Realized Gains This Year
            </label>
            <input
              type="number"
              value={realizedGains}
              onChange={(e) => setRealizedGains(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Tax Bracket
            </label>
            <select
              value={taxBracket}
              onChange={(e) => setTaxBracket(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value={0.1}>10%</option>
              <option value={0.12}>12%</option>
              <option value={0.22}>22%</option>
              <option value={0.24}>24%</option>
              <option value={0.32}>32%</option>
              <option value={0.35}>35%</option>
              <option value={0.37}>37%</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          This is a demonstration. Edit holdings in the code or connect to real
          portfolio data.
        </p>
      </div>

      {/* Results Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">
            Total Harvestable Losses
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(result.totalHarvestableLosses)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Estimated Tax Savings</div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(result.estimatedTaxSavings)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Loss Carryforward</div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatCurrency(result.remainingCarryforward)}
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Harvesting Candidates
        </h2>
        <TaxLossTable candidates={result.harvestCandidates} />
      </div>

      {/* Warning */}
      <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
        <h3 className="mb-2 font-bold text-amber-200">Wash Sale Warning</h3>
        <p className="text-sm text-amber-200">{result.washSaleWarning}</p>
      </div>
    </div>
  );
}

// ============== CAPITAL GAINS TAB ==============

function CapitalGainsTab() {
  const [input, setInput] = useState<CapitalGainsInput>({
    shortTermGains: 15000,
    longTermGains: 50000,
    ordinaryIncome: 100000,
    filingStatus: "SINGLE",
    stateRate: 0.05,
  });

  const result = analyzeCapitalGains(input);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Capital Gains Parameters
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Short-Term Gains
            </label>
            <input
              type="number"
              value={input.shortTermGains}
              onChange={(e) =>
                setInput({ ...input, shortTermGains: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Long-Term Gains
            </label>
            <input
              type="number"
              value={input.longTermGains}
              onChange={(e) =>
                setInput({ ...input, longTermGains: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Ordinary Income
            </label>
            <input
              type="number"
              value={input.ordinaryIncome}
              onChange={(e) =>
                setInput({ ...input, ordinaryIncome: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Filing Status
            </label>
            <select
              value={input.filingStatus}
              onChange={(e) =>
                setInput({
                  ...input,
                  filingStatus: e.target.value as "SINGLE" | "MFJ" | "HOH",
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value="SINGLE">Single</option>
              <option value="MFJ">Married Filing Jointly</option>
              <option value="HOH">Head of Household</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              State Tax Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={input.stateRate}
              onChange={(e) =>
                setInput({ ...input, stateRate: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Federal Tax</div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatCurrency(result.federalTax)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">State Tax</div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatCurrency(result.stateTax)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Total Tax</div>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(result.totalTax)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Effective Rate</div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatPercent(result.effectiveRate)}
          </div>
        </div>
      </div>

      {/* NIIT */}
      {result.niitApplies && (
        <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
          <h3 className="mb-2 font-bold text-amber-200">
            Net Investment Income Tax (NIIT)
          </h3>
          <p className="mb-2 text-sm text-amber-200">
            Your income exceeds the NIIT threshold. An additional 3.8% tax
            applies to investment income.
          </p>
          <div className="text-lg font-bold text-amber-200">
            NIIT Amount: {formatCurrency(result.niitAmount)}
          </div>
        </div>
      )}

      {/* Strategies */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Optimization Strategies
        </h2>
        {result.strategies.length > 0 ? (
          <ul className="space-y-2">
            {result.strategies.map((strategy, idx) => (
              <li key={idx} className="flex items-start gap-2 text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400"></span>
                <span>{strategy}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-400">No specific strategies at this time.</p>
        )}
      </div>
    </div>
  );
}

// ============== MULTI-YEAR PROJECTION TAB ==============

function MultiYearProjectionTab() {
  const [input, setInput] = useState<MultiYearTaxInput>({
    currentIncome: 120000,
    incomeGrowthRate: 0.03,
    filingStatus: "SINGLE",
    state: "CA",
    stateRate: 0.095,
    retirementAge: 65,
    currentAge: 35,
    projectionYears: 30,
    rothConversions: [],
    expectedRetirementIncome: 60000,
  });

  const result = projectMultiYearTax(input);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Projection Parameters
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Current Income
            </label>
            <input
              type="number"
              value={input.currentIncome}
              onChange={(e) =>
                setInput({ ...input, currentIncome: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Income Growth Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={input.incomeGrowthRate}
              onChange={(e) =>
                setInput({
                  ...input,
                  incomeGrowthRate: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Filing Status
            </label>
            <select
              value={input.filingStatus}
              onChange={(e) =>
                setInput({
                  ...input,
                  filingStatus: e.target.value as "SINGLE" | "MFJ" | "HOH",
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            >
              <option value="SINGLE">Single</option>
              <option value="MFJ">Married Filing Jointly</option>
              <option value="HOH">Head of Household</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              State Tax Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={input.stateRate}
              onChange={(e) =>
                setInput({ ...input, stateRate: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Current Age
            </label>
            <input
              type="number"
              value={input.currentAge}
              onChange={(e) =>
                setInput({ ...input, currentAge: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Retirement Age
            </label>
            <input
              type="number"
              value={input.retirementAge}
              onChange={(e) =>
                setInput({ ...input, retirementAge: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Projection Years
            </label>
            <input
              type="number"
              value={input.projectionYears}
              onChange={(e) =>
                setInput({ ...input, projectionYears: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Retirement Income
            </label>
            <input
              type="number"
              value={input.expectedRetirementIncome}
              onChange={(e) =>
                setInput({
                  ...input,
                  expectedRetirementIncome: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">Total Lifetime Tax</div>
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(result.totalLifetimeTax)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-1 text-sm text-zinc-400">
            Average Effective Rate
          </div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatPercent(result.averageEffectiveRate)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Tax Projection Over Time
        </h2>
        <TaxProjectionChart data={result.yearByYear} />
      </div>

      {/* Year-by-Year Table (sample - first 10 years) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Year-by-Year Detail (First 10 Years)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-2 text-left">Age</th>
                <th className="px-4 py-2 text-right">Gross Income</th>
                <th className="px-4 py-2 text-right">Total Tax</th>
                <th className="px-4 py-2 text-right">Effective Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {result.yearByYear.slice(0, 10).map((year) => (
                <tr key={year.year} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-2 text-zinc-50">{year.age}</td>
                  <td className="px-4 py-2 text-right text-zinc-50">
                    {formatCurrency(year.grossIncome)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-400">
                    {formatCurrency(year.totalTax)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-50">
                    {formatPercent(year.effectiveRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
