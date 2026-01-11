"use client";

import { useEffect, useState } from "react";
import NetWorthChart from "@/components/charts/NetWorthChart";

interface ProjectionChartProps {
  scenarioId: string;
}

interface ProjectionData {
  t: string;
  v: number;
}

export default function ProjectionChart({ scenarioId }: ProjectionChartProps) {
  const [data, setData] = useState<ProjectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjection() {
      try {
        // For now, generate sample projection data based on accounts
        // In a full implementation, this would call the engine API
        const accountsRes = await fetch(`/api/accounts?scenarioId=${scenarioId}`);
        const incomesRes = await fetch(`/api/incomes?scenarioId=${scenarioId}`);
        const expensesRes = await fetch(`/api/expenses?scenarioId=${scenarioId}`);

        if (!accountsRes.ok || !incomesRes.ok || !expensesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const accountsData = await accountsRes.json();
        const incomesData = await incomesRes.json();
        const expensesData = await expensesRes.json();

        // Calculate initial net worth
        const initialNetWorth = accountsData.accounts.reduce(
          (sum: number, acc: { balance: number }) => sum + acc.balance,
          0
        );

        // Annualize income and expenses
        const frequencyMultipliers: Record<string, number> = {
          ANNUAL: 1,
          MONTHLY: 12,
          BIWEEKLY: 26,
          WEEKLY: 52,
          ONE_TIME: 0,
        };

        const annualIncome = incomesData.incomes.reduce(
          (sum: number, inc: { amount: number; frequency: string }) =>
            sum + inc.amount * (frequencyMultipliers[inc.frequency] ?? 1),
          0
        );

        const annualExpenses = expensesData.expenses.reduce(
          (sum: number, exp: { amount: number; frequency: string }) =>
            sum + exp.amount * (frequencyMultipliers[exp.frequency] ?? 1),
          0
        );

        const annualSavings = annualIncome - annualExpenses;
        const estimatedTaxRate = 0.25;
        const netAnnualSavings = annualSavings * (1 - estimatedTaxRate);
        const growthRate = 0.06; // 6% investment growth

        // Project 10 years
        const currentDate = new Date();
        const projectionYears = 10;
        const projection: ProjectionData[] = [];

        let netWorth = initialNetWorth;
        for (let i = 0; i <= projectionYears; i++) {
          const projectionDate = new Date(currentDate);
          projectionDate.setFullYear(currentDate.getFullYear() + i);
          projection.push({
            t: projectionDate.toISOString(),
            v: Math.round(netWorth),
          });
          // Apply growth and add savings
          netWorth = netWorth * (1 + growthRate) + netAnnualSavings;
        }

        setData(projection);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projection");
      } finally {
        setLoading(false);
      }
    }

    fetchProjection();
  }, [scenarioId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Net Worth Projection</h2>
        <div className="h-[200px] flex items-center justify-center">
          <div className="text-zinc-500">Loading projection...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Net Worth Projection</h2>
        <div className="h-[200px] flex items-center justify-center">
          <div className="text-zinc-500">{error}</div>
        </div>
      </div>
    );
  }

  const startValue = data[0]?.v ?? 0;
  const endValue = data[data.length - 1]?.v ?? 0;
  const growth = endValue - startValue;
  const growthPct = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium">Net Worth Projection</h2>
          <p className="text-sm text-zinc-400">10-year forecast based on current data</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-emerald-400">
            +{formatCurrency(growth)}
          </div>
          <div className="text-xs text-zinc-500">
            +{growthPct.toFixed(0)}% projected growth
          </div>
        </div>
      </div>
      <NetWorthChart series={data} height={200} />
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}
