"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import ProjectionChart from "@/components/dashboard/ProjectionChart";
import HealthScoreGauge from "@/components/dashboard/HealthScoreGauge";
import ComponentScores from "@/components/dashboard/ComponentScores";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import DashboardConfig from "@/components/dashboard/DashboardConfig";
import { InsightsWidget } from "@/components/insights/InsightsWidget";
import { formatCurrency } from "@/lib/format";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import {
  getConfig,
  saveConfig,
  isWidgetEnabled,
  type WidgetConfig,
} from "@/lib/dashboard/widgetConfig";

type DashboardData = {
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  netWorth: number;
  goalsProgress: number;
  goalsCount: number;
};

type HealthScoreData = {
  overall: number;
  components: { name: string; score: number; weight: number; description: string }[];
  insights: { type: "positive" | "warning" | "action"; title: string; description: string }[];
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color = "zinc",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "zinc" | "green" | "red" | "blue" | "purple";
}) {
  const colorClasses = {
    zinc: "bg-zinc-900 border-zinc-800",
    green: "bg-emerald-950/50 border-emerald-900/50",
    red: "bg-red-950/50 border-red-900/50",
    blue: "bg-blue-950/50 border-blue-900/50",
    purple: "bg-purple-950/50 border-purple-900/50",
  };

  const iconColors = {
    zinc: "text-zinc-400",
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickActionButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

// Icons
function IncomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function ExpenseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function NetWorthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GoalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function DashboardClient({ userName }: { userName: string }) {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const [data, setData] = useState<DashboardData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>([]);
  const [configOpen, setConfigOpen] = useState(false);

  // Load widget config on mount
  useEffect(() => {
    setWidgetConfig(getConfig());
  }, []);

  const handleSaveConfig = useCallback((config: WidgetConfig[]) => {
    saveConfig(config);
    setWidgetConfig(config);
  }, []);

  useEffect(() => {
    if (!selectedScenarioId) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [dashRes, healthRes] = await Promise.all([
          fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`, { signal: abortController.signal }),
          fetch(`/api/health-score?scenarioId=${selectedScenarioId}`, { signal: abortController.signal }),
        ]);

        if (!dashRes.ok) throw new Error("Failed to fetch dashboard data");
        const dashboardData = await dashRes.json();
        setData(dashboardData);

        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealthScore(healthData);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    return () => abortController.abort();
  }, [selectedScenarioId]);

  // Build a map of widget ID -> rendered JSX (must be before early returns per Rules of Hooks)
  const widgetRenderers: Record<string, React.ReactNode> = useMemo(() => ({
    "summary-cards": data ? (
      <div key="summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Annual Income"
          value={formatCurrency(data.totalAnnualIncome)}
          subtitle="Total projected income"
          color="green"
          icon={<IncomeIcon className="w-6 h-6" />}
        />
        <SummaryCard
          title="Annual Expenses"
          value={formatCurrency(data.totalAnnualExpenses)}
          subtitle="Total projected expenses"
          color="red"
          icon={<ExpenseIcon className="w-6 h-6" />}
        />
        <SummaryCard
          title="Net Worth"
          value={formatCurrency(data.netWorth)}
          subtitle="Total account balances"
          color="blue"
          icon={<NetWorthIcon className="w-6 h-6" />}
        />
        <SummaryCard
          title="Goals Progress"
          value={`${data.goalsProgress.toFixed(0)}%`}
          subtitle={`${data.goalsCount} active goal${data.goalsCount !== 1 ? "s" : ""}`}
          color="purple"
          icon={<GoalIcon className="w-6 h-6" />}
        />
      </div>
    ) : (
      <div key="summary-cards" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-zinc-400">No data available for this scenario.</p>
      </div>
    ),

    "health-score": healthScore ? (
      <div key="health-score" className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-medium mb-4">Financial Health Score</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex justify-center">
            <HealthScoreGauge score={healthScore.overall} />
          </div>
          <ComponentScores components={healthScore.components} />
        </div>
      </div>
    ) : null,

    "projection-chart":
      data && selectedScenarioId ? (
        <ProjectionChart key="projection-chart" scenarioId={selectedScenarioId} />
      ) : null,

    "quick-actions": (
      <div key="quick-actions" className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionButton href="/incomes" label="Add Income" icon={<PlusIcon />} />
          <QuickActionButton href="/expenses" label="Add Expense" icon={<PlusIcon />} />
          <QuickActionButton href="/investments" label="Add Investment" icon={<PlusIcon />} />
          <QuickActionButton href="/goals" label="Set Goal" icon={<PlusIcon />} />
        </div>
      </div>
    ),

    "recent-insights":
      healthScore && healthScore.insights.length > 0 ? (
        <InsightsPanel key="recent-insights" insights={healthScore.insights} />
      ) : null,

    "proactive-insights": selectedScenarioId ? (
      <InsightsWidget key="proactive-insights" />
    ) : null,
  }), [data, healthScore, selectedScenarioId]);

  // Render widgets sorted by user-configured order, filtered by enabled state
  const sortedWidgets = useMemo(() => [...widgetConfig]
    .sort((a, b) => a.order - b.order)
    .filter((w) => w.enabled && widgetRenderers[w.id] !== undefined)
    .map((w) => widgetRenderers[w.id])
    .filter(Boolean), [widgetConfig, widgetRenderers]);

  if (scenarioLoading || (loading && selectedScenarioId)) {
    return <DashboardSkeleton />;
  }

  if (scenarioError || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{scenarioError || error}</div>
      </div>
    );
  }

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">No scenario selected. Please create a household and scenario first.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section + Customize button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {userName}</h1>
          <p className="text-zinc-400 mt-1">Here&apos;s your financial overview</p>
        </div>
        <button
          onClick={() => setConfigOpen(true)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50 transition-colors"
          aria-label="Customize dashboard"
        >
          <GearIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Configurable widgets */}
      {sortedWidgets}

      {/* Dashboard Config Modal */}
      <DashboardConfig
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={handleSaveConfig}
        currentConfig={widgetConfig}
      />
    </div>
  );
}
