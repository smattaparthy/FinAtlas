"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";

interface ComponentScore {
  name: string;
  score: number;
  description: string;
}

interface Insight {
  type: "positive" | "warning" | "action";
  title: string;
  description: string;
}

interface HealthScoreData {
  overall: number;
  components: ComponentScore[];
  insights: Insight[];
}

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
}

function getScoreColor(score: number): string {
  if (score >= 81) return "text-emerald-400";
  if (score >= 61) return "text-blue-400";
  if (score >= 41) return "text-amber-400";
  return "text-red-400";
}

function getScoreStroke(score: number): string {
  if (score >= 81) return "stroke-emerald-500";
  if (score >= 61) return "stroke-blue-500";
  if (score >= 41) return "stroke-amber-500";
  return "stroke-red-500";
}

function getBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getBadgeClasses(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-400";
  if (score >= 60) return "bg-blue-500/10 text-blue-400";
  if (score >= 40) return "bg-amber-500/10 text-amber-400";
  return "bg-red-500/10 text-red-400";
}

function getRatingLabel(score: number): string {
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 41) return "Fair";
  return "Needs Work";
}

interface TipConfig {
  title: string;
  advice: string;
  href: string;
}

function getTipForComponent(name: string): TipConfig {
  switch (name) {
    case "Savings Rate":
      return {
        title: "Boost Your Savings Rate",
        advice:
          "Increase contributions or reduce discretionary spending to improve your savings rate.",
        href: "/budget",
      };
    case "Debt-to-Income":
      return {
        title: "Reduce Debt-to-Income Ratio",
        advice:
          "Focus on paying down high-interest debt to improve your DTI ratio.",
        href: "/debt-payoff",
      };
    case "Emergency Fund":
      return {
        title: "Build Your Emergency Fund",
        advice:
          "Build your emergency fund to cover at least 6 months of expenses.",
        href: "/emergency-fund",
      };
    case "Retirement Readiness":
      return {
        title: "Increase Retirement Savings",
        advice:
          "Increase retirement contributions to build toward your FIRE number.",
        href: "/fire-calculator",
      };
    case "NW Growth":
      return {
        title: "Improve Net Worth Growth",
        advice:
          "Review your investment allocation to improve net worth growth trajectory.",
        href: "/rebalancing",
      };
    default:
      return {
        title: `Improve ${name}`,
        advice: `Work on improving your ${name.toLowerCase()} score.`,
        href: "/reports",
      };
  }
}

export default function FinancialHealthPage() {
  const { selectedScenarioId } = useScenario();
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, dashRes] = await Promise.all([
          fetch(`/api/health-score?scenarioId=${selectedScenarioId}`),
          fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`),
        ]);

        if (!healthRes.ok) throw new Error("Failed to load health score");
        setHealthData(await healthRes.json());

        if (dashRes.ok) setDashboard(await dashRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedScenarioId]);

  if (loading) return <PageSkeleton />;

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

  if (!healthData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400 text-sm">
          No financial data available yet.
        </div>
        <div className="flex gap-3">
          <Link
            href="/incomes"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Add Income
          </Link>
          <span className="text-zinc-600">|</span>
          <Link
            href="/expenses"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Add Expenses
          </Link>
        </div>
      </div>
    );
  }

  const { overall, components, insights } = healthData;

  // SVG gauge calculations
  const radius = 52;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270-degree arc
  const filledLength = (overall / 100) * arcLength;
  const dashOffset = arcLength - filledLength;

  // Improvement tips: weakest components below 80, sorted ascending, take up to 3
  const weakComponents = [...components]
    .filter((c) => c.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">
          Financial Health Score
        </h1>
        <p className="mt-2 text-zinc-400">
          Comprehensive assessment of your financial wellness
        </p>
      </div>

      {/* Section 1 -- Score Gauge */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8">
        <div className="flex flex-col items-center">
          <div className="relative w-[240px] h-[240px]">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {/* Background arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                className="stroke-zinc-800"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={0}
                transform="rotate(135 60 60)"
              />
              {/* Foreground arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                className={getScoreStroke(overall)}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filledLength} ${circumference}`}
                strokeDashoffset={0}
                transform="rotate(135 60 60)"
                style={{
                  transition: "stroke-dasharray 0.8s ease-out",
                }}
              />
            </svg>
            {/* Score text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${getScoreColor(overall)}`}>
                {overall}
              </span>
              <span className="text-sm text-zinc-400 mt-1">out of 100</span>
            </div>
          </div>
          <div className={`mt-4 text-lg font-semibold ${getScoreColor(overall)}`}>
            {getRatingLabel(overall)}
          </div>
          {dashboard && (
            <div className="mt-4 grid grid-cols-3 gap-6 text-center text-sm">
              <div>
                <div className="text-zinc-400">Net Worth</div>
                <div className="font-semibold text-zinc-200 mt-0.5">
                  {formatCurrency(dashboard.netWorth)}
                </div>
              </div>
              <div>
                <div className="text-zinc-400">Net Savings</div>
                <div className="font-semibold text-zinc-200 mt-0.5">
                  {formatCurrency(dashboard.netSavings)}
                </div>
              </div>
              <div>
                <div className="text-zinc-400">Total Debt</div>
                <div className="font-semibold text-zinc-200 mt-0.5">
                  {formatCurrency(dashboard.totalDebt)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 -- Component Scores */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-medium mb-5">Score Breakdown</h2>
        <div className="space-y-5">
          {components.map((component) => (
            <div key={component.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-zinc-200">
                  {component.name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeClasses(component.score)}`}
                >
                  {component.score}/100
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getBarColor(component.score)}`}
                  style={{
                    width: `${component.score}%`,
                    transition: "width 0.6s ease-out",
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {component.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 -- Improvement Tips */}
      {weakComponents.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">
            Improvement Opportunities
          </h2>
          <div className="space-y-3">
            {weakComponents.map((component) => {
              const tip = getTipForComponent(component.name);
              const isWarning = component.score < 40;
              return (
                <div
                  key={component.name}
                  className={`rounded-xl border p-4 ${
                    isWarning
                      ? "border-l-amber-500 border-amber-800/30 bg-amber-950/10"
                      : "border-l-emerald-500 border-zinc-700 bg-zinc-800/30"
                  }`}
                  style={{
                    borderLeftWidth: "3px",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className={`w-4 h-4 flex-shrink-0 ${
                            isWarning ? "text-amber-400" : "text-emerald-400"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          {isWarning ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                            />
                          )}
                        </svg>
                        <h3 className="text-sm font-medium text-zinc-200">
                          {tip.title}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 ml-6">
                        {tip.advice}
                      </p>
                    </div>
                    <Link
                      href={tip.href}
                      className="flex-shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
                    >
                      Take Action &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4 -- Insights */}
      {insights.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Key Insights</h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border ${
                  insight.type === "positive"
                    ? "border-emerald-800/30 bg-emerald-950/20"
                    : insight.type === "warning"
                      ? "border-amber-800/30 bg-amber-950/20"
                      : "border-blue-800/30 bg-blue-950/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {insight.type === "positive" && (
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
                  )}
                  {insight.type === "warning" && (
                    <svg
                      className="w-4 h-4 text-amber-400"
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
                  )}
                  {insight.type === "action" && (
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  )}
                  <h3 className="text-sm font-medium text-zinc-50">
                    {insight.title}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 ml-6">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
