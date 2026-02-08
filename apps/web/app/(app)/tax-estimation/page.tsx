"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import TaxBracketChart from "@/components/charts/TaxBracketChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { TaxBreakdown, PayrollTax } from "@/lib/tax/taxCalculations";

interface TaxEstimationData {
  grossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  federalTax: TaxBreakdown;
  stateTax: TaxBreakdown | null;
  payrollTax: PayrollTax | null;
  totalTax: number;
  takeHomePay: number;
  effectiveRate: number;
  taxProfile: {
    filingStatus: string;
    state: string | null;
    taxYear: number;
    includePayrollTaxes: boolean;
  };
}

export default function TaxEstimationPage() {
  const { selectedScenarioId } = useScenario();
  const [data, setData] = useState<TaxEstimationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaxEstimation = useCallback(async () => {
    if (!selectedScenarioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tax-estimation?scenarioId=${selectedScenarioId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tax estimation");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    fetchTaxEstimation();
  }, [fetchTaxEstimation]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-800 bg-red-950/60 p-5 text-red-200">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-zinc-400">
          No scenario selected
        </div>
      </div>
    );
  }

  if (data.grossIncome === 0) {
    return (
      <div className="p-8">
        <h1 className="mb-2 text-3xl font-bold text-zinc-50">
          Tax Estimation
        </h1>
        <p className="mb-8 text-zinc-400">
          Estimate your annual tax liability
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <p className="text-lg text-zinc-400">
            No taxable income data found. Add income sources to estimate taxes.
          </p>
        </div>
      </div>
    );
  }

  const filingStatusLabels: Record<string, string> = {
    SINGLE: "Single",
    MFJ: "Married Filing Jointly",
    HOH: "Head of Household",
  };

  const getEffectiveRateColor = (rate: number): string => {
    if (rate < 0.2) return "text-emerald-400";
    if (rate < 0.3) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl font-bold text-zinc-50">Tax Estimation</h1>
      <p className="mb-8 text-zinc-400">Estimate your annual tax liability</p>

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Filing Status:</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {filingStatusLabels[data.taxProfile.filingStatus] ??
                data.taxProfile.filingStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">State:</span>
            <span className="text-sm font-medium text-zinc-50">
              {data.taxProfile.state ?? "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Tax Year:</span>
            <span className="text-sm font-medium text-zinc-50">
              {data.taxProfile.taxYear}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="mb-1 text-sm text-zinc-400">Gross Income</div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatCurrency(data.grossIncome)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="mb-1 text-sm text-zinc-400">Total Tax</div>
          <div className="text-2xl font-bold text-zinc-50">
            {formatCurrency(data.totalTax)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="mb-1 text-sm text-zinc-400">Effective Rate</div>
          <div
            className={`text-2xl font-bold ${getEffectiveRateColor(data.effectiveRate)}`}
          >
            {formatPercent(data.effectiveRate)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="mb-1 text-sm text-zinc-400">Take-Home Pay</div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(data.takeHomePay)}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">
          Federal Tax Brackets
        </h2>
        <TaxBracketChart brackets={data.federalTax.brackets} />
        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="text-sm font-medium text-zinc-400">
            Total Federal Tax
          </span>
          <span className="text-lg font-bold text-zinc-50">
            {formatCurrency(data.federalTax.totalTax)}
          </span>
        </div>
      </div>

      {data.stateTax ? (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold text-zinc-50">
            State Tax Brackets
          </h2>
          <TaxBracketChart brackets={data.stateTax.brackets} />
          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm font-medium text-zinc-400">
              Total State Tax
            </span>
            <span className="text-lg font-bold text-zinc-50">
              {formatCurrency(data.stateTax.totalTax)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold text-zinc-50">State Tax</h2>
          <p className="text-zinc-400">No state tax profile configured</p>
        </div>
      )}

      {data.payrollTax && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="mb-4 text-xl font-bold text-zinc-50">Payroll Tax</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Social Security</span>
              <span className="text-sm font-medium text-zinc-50">
                {formatCurrency(data.payrollTax.socialSecurity)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Medicare</span>
              <span className="text-sm font-medium text-zinc-50">
                {formatCurrency(data.payrollTax.medicare)}
              </span>
            </div>
            {data.payrollTax.additionalMedicare > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  Additional Medicare
                </span>
                <span className="text-sm font-medium text-zinc-50">
                  {formatCurrency(data.payrollTax.additionalMedicare)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-sm font-medium text-zinc-400">
                Total Payroll Tax
              </span>
              <span className="text-lg font-bold text-zinc-50">
                {formatCurrency(data.payrollTax.total)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="mb-4 text-xl font-bold text-zinc-50">Summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Gross Income</span>
            <span className="text-sm font-medium text-zinc-50">
              {formatCurrency(data.grossIncome)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Standard Deduction</span>
            <span className="text-sm font-medium text-zinc-50">
              -{formatCurrency(data.standardDeduction)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="text-sm text-zinc-400">Taxable Income</span>
            <span className="text-sm font-medium text-zinc-50">
              {formatCurrency(data.taxableIncome)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Federal Tax</span>
            <span className="text-sm font-medium text-zinc-50">
              {formatCurrency(data.federalTax.totalTax)}
            </span>
          </div>
          {data.stateTax && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">State Tax</span>
              <span className="text-sm font-medium text-zinc-50">
                {formatCurrency(data.stateTax.totalTax)}
              </span>
            </div>
          )}
          {data.payrollTax && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Payroll Tax</span>
              <span className="text-sm font-medium text-zinc-50">
                {formatCurrency(data.payrollTax.total)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="font-medium text-zinc-50">Total Tax</span>
            <span className="text-lg font-bold text-zinc-50">
              {formatCurrency(data.totalTax)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="font-medium text-zinc-50">Take-Home Pay</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatCurrency(data.takeHomePay)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
        <p className="text-sm text-amber-200">
          These are estimates based on your tax profile and income data.
          Consult a qualified tax professional for actual tax planning.
        </p>
      </div>
    </div>
  );
}
