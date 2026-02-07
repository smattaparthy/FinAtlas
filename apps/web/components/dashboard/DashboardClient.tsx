"use client";

import { useEffect, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import ProjectionChart from "@/components/dashboard/ProjectionChart";
import Link from "next/link";

type DashboardData = {
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  netWorth: number;
  goalsProgress: number;
  goalsCount: number;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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
    <div className={`rounded-2xl border p-6 ${colorClasses[color]}`}>
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

export function DashboardClient({ userName }: { userName: string }) {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScenarioId) {
      setLoading(false);
      return;
    }

    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedScenarioId]);

  if (scenarioLoading || (loading && selectedScenarioId)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
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
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {userName}</h1>
        <p className="text-zinc-400 mt-1">Here&apos;s your financial overview</p>
      </div>

      {/* Summary cards */}
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No data available for this scenario.</p>
        </div>
      )}

      {/* Net Worth Projection Chart */}
      {data && selectedScenarioId && <ProjectionChart scenarioId={selectedScenarioId} />}

      {/* Quick actions */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionButton href="/incomes" label="Add Income" icon={<PlusIcon />} />
          <QuickActionButton href="/expenses" label="Add Expense" icon={<PlusIcon />} />
          <QuickActionButton href="/investments" label="Add Investment" icon={<PlusIcon />} />
          <QuickActionButton href="/goals" label="Set Goal" icon={<PlusIcon />} />
        </div>
      </div>
    </div>
  );
}
