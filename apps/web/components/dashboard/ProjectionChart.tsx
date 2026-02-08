"use client";

import { useEffect, useState } from "react";
import NetWorthChart from "@/components/charts/NetWorthChart";
import { formatCompactCurrency } from "@/lib/format";
import { FREQUENCY_MULTIPLIERS, DEFAULT_TAX_RATE, DEFAULT_PROJECTION_GROWTH_RATE, DEFAULT_CHART_PROJECTION_YEARS } from "@/lib/constants";

interface ProjectionChartProps {
  scenarioId: string;
}

interface ProjectionData {
  t: string;
  v: number;
}

interface Milestone {
  date: string;
  name: string;
  color: string;
}

export default function ProjectionChart({ scenarioId }: ProjectionChartProps) {
  const [data, setData] = useState<ProjectionData[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
        const annualIncome = incomesData.incomes.reduce(
          (sum: number, inc: { amount: number; frequency: string }) =>
            sum + inc.amount * (FREQUENCY_MULTIPLIERS[inc.frequency] ?? 1),
          0
        );

        const annualExpenses = expensesData.expenses.reduce(
          (sum: number, exp: { amount: number; frequency: string }) =>
            sum + exp.amount * (FREQUENCY_MULTIPLIERS[exp.frequency] ?? 1),
          0
        );

        const annualSavings = annualIncome - annualExpenses;
        const estimatedTaxRate = DEFAULT_TAX_RATE;
        const netAnnualSavings = annualSavings * (1 - estimatedTaxRate);
        const growthRate = DEFAULT_PROJECTION_GROWTH_RATE;

        // Project forward
        const currentDate = new Date();
        const projectionYears = DEFAULT_CHART_PROJECTION_YEARS;
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

        // Fetch life events for milestone markers
        try {
          const eventsRes = await fetch(`/api/life-events?scenarioId=${scenarioId}`);
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            setMilestones(
              eventsData.lifeEvents.map((e: { targetDate: string; name: string; color: string }) => ({
                date: e.targetDate,
                name: e.name,
                color: e.color,
              }))
            );
          }
        } catch {
          // Milestones are non-critical, don't block chart
        }
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
            +{formatCompactCurrency(growth)}
          </div>
          <div className="text-xs text-zinc-500">
            +{growthPct.toFixed(0)}% projected growth
          </div>
        </div>
      </div>
      <NetWorthChart series={data} height={200} milestones={milestones} />
    </div>
  );
}

