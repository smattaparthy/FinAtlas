"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import FundingTimeline from "@/components/goal-planner/FundingTimeline";

interface GoalPlan {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
  monthsRemaining: number | null;
  allocatedSavings: number;
  requiredMonthly: number | null;
  onTrack: boolean;
  projectedCompletionMonths: number | null;
}

interface Summary {
  totalMonthlyNeeded: number;
  monthlySavingsAvailable: number;
  fundingGap: number;
  totalTargetAmount: number;
  totalAllocatedSavings: number;
}

interface GoalPlannerData {
  goals: GoalPlan[];
  summary: Summary;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  RETIREMENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EDUCATION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MAJOR_PURCHASE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  EMERGENCY_FUND: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  CUSTOM: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  RETIREMENT: "Retirement",
  EDUCATION: "Education",
  MAJOR_PURCHASE: "Major Purchase",
  EMERGENCY_FUND: "Emergency Fund",
  CUSTOM: "Custom",
};

function formatMonths(months: number): string {
  if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  }
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (remaining === 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
  return `${years}y ${remaining}m`;
}

export default function GoalPlannerPage() {
  const { selectedScenarioId } = useScenario();
  const [data, setData] = useState<GoalPlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/goal-planner?scenarioId=${selectedScenarioId}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch goal planner data");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load goal planner"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedScenarioId]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error}</div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!data || data.goals.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Goal Funding Planner</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Calculate funding strategies for your financial goals
          </p>
        </div>
        <EmptyState
          icon="🎯"
          title="No goals yet"
          description="Add financial goals to see your personalized funding plan"
          actionLabel="Add your first goal"
          actionHref={`/goals/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
        />
      </div>
    );
  }

  const { goals, summary } = data;
  const hasSurplus = summary.fundingGap < 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Goal Funding Planner</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Calculate funding strategies for your financial goals
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Monthly Savings Available
          </div>
          <div className="text-2xl font-semibold mt-1 text-emerald-400">
            {formatCurrency(summary.monthlySavingsAvailable)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Total Monthly Needed
          </div>
          <div className="text-2xl font-semibold mt-1 text-zinc-50">
            {formatCurrency(summary.totalMonthlyNeeded)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Funding Gap
          </div>
          <div
            className={`text-2xl font-semibold mt-1 ${
              hasSurplus ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {hasSurplus
              ? `+${formatCurrency(Math.abs(summary.fundingGap))} surplus`
              : `-${formatCurrency(Math.abs(summary.fundingGap))} shortfall`}
          </div>
        </div>
      </div>

      {/* Goal Funding Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const progressPct =
            goal.targetAmount > 0
              ? Math.min(
                  (goal.allocatedSavings / goal.targetAmount) * 100,
                  100
                )
              : 0;

          return (
            <div
              key={goal.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
            >
              {/* Header: name + type badge */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{goal.name}</h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                    TYPE_BADGE_COLORS[goal.type] ?? TYPE_BADGE_COLORS.CUSTOM
                  }`}
                >
                  {TYPE_LABELS[goal.type] ?? goal.type}
                </span>
              </div>

              {/* Target */}
              <div className="text-sm text-zinc-400 mb-3">
                <span className="text-zinc-50 font-medium">
                  {formatCurrency(goal.targetAmount)}
                </span>
                {goal.targetDate ? (
                  <span>
                    {" "}
                    by{" "}
                    {new Date(goal.targetDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ) : null}
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-zinc-500 mb-4">
                {formatCurrency(goal.allocatedSavings)} of{" "}
                {formatCurrency(goal.targetAmount)} saved
              </div>

              {/* Required monthly */}
              {goal.requiredMonthly !== null ? (
                <div className="text-sm mb-3">
                  <span className="text-zinc-400">Required: </span>
                  <span className="font-bold text-zinc-50">
                    {formatCurrency(goal.requiredMonthly)}
                  </span>
                  <span className="text-zinc-400"> per month</span>
                </div>
              ) : null}

              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-2">
                {goal.requiredMonthly !== null ? (
                  goal.onTrack ? (
                    <>
                      <svg
                        className="w-4 h-4 text-emerald-400"
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
                      <span className="text-sm text-emerald-400">
                        On Track
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                      <span className="text-sm text-red-400">
                        Needs Attention
                      </span>
                    </>
                  )
                ) : null}
              </div>

              {/* Time remaining */}
              <div className="text-xs text-zinc-500">
                {goal.monthsRemaining !== null ? (
                  <span>{formatMonths(goal.monthsRemaining)} remaining</span>
                ) : (
                  <span>No target date set</span>
                )}
                {goal.projectedCompletionMonths !== null && (
                  <span className="ml-2">
                    &middot; Projected in{" "}
                    {formatMonths(goal.projectedCompletionMonths)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funding Timeline Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Funding Timeline</h2>
          <p className="text-sm text-zinc-400">
            Projected growth toward each goal over time
          </p>
        </div>
        <FundingTimeline
          goals={goals}
          monthlySavingsAvailable={summary.monthlySavingsAvailable}
        />
      </div>
    </div>
  );
}
