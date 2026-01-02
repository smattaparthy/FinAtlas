"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Goal = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
  createdAt: string;
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  RETIREMENT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  EDUCATION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MAJOR_PURCHASE: "bg-green-500/20 text-green-400 border-green-500/30",
  EMERGENCY_FUND: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CUSTOM: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  RETIREMENT: "Retirement",
  EDUCATION: "Education",
  MAJOR_PURCHASE: "Major Purchase",
  EMERGENCY_FUND: "Emergency Fund",
  CUSTOM: "Custom",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-yellow-500",
  3: "bg-green-500",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
};

type SortOption = "priority" | "targetDate" | "amount";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTimeUntil(targetDate: string | null): string {
  if (!targetDate) return "No target date";

  const target = new Date(targetDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return "Past due";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} left`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} left`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths > 0) {
    return `${diffYears}y ${remainingMonths}m left`;
  }
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} left`;
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Progress</span>
        <span>{progress.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("priority");

  // Fetch scenario ID
  useEffect(() => {
    async function fetchScenarioId() {
      try {
        const res = await fetch("/api/scenarios?limit=1");
        if (res.ok) {
          const data = await res.json();
          if (data.scenarios?.length > 0) {
            setScenarioId(data.scenarios[0].id);
          } else {
            setError("No scenario found. Please create a household and scenario first.");
            setLoading(false);
          }
        } else {
          setError("Unable to load scenarios. Please ensure you have a household set up.");
          setLoading(false);
        }
      } catch {
        setError("Failed to load scenarios");
        setLoading(false);
      }
    }
    fetchScenarioId();
  }, []);

  // Fetch goals
  useEffect(() => {
    if (!scenarioId) return;

    async function fetchGoals() {
      setLoading(true);
      try {
        const res = await fetch(`/api/goals?scenarioId=${scenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch goals");
        }
        const data = await res.json();
        setGoals(data.goals);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goals");
      } finally {
        setLoading(false);
      }
    }
    fetchGoals();
  }, [scenarioId]);

  async function handleDelete(goalId: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setDeleting(goalId);
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }
      setGoals(goals.filter((g) => g.id !== goalId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete goal");
    } finally {
      setDeleting(null);
    }
  }

  // Sort goals
  const sortedGoals = [...goals].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return a.priority - b.priority;
      case "targetDate":
        if (!a.targetDate && !b.targetDate) return 0;
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      case "amount":
        return b.targetAmount - a.targetAmount;
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const highPriorityCount = goals.filter((g) => g.priority === 1).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading goals...</div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track and manage your financial goals
          </p>
        </div>
        <Link
          href={`/goals/new${scenarioId ? `?scenarioId=${scenarioId}` : ""}`}
          className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
        >
          Add Goal
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Total Target
          </div>
          <div className="text-2xl font-semibold mt-1">
            {formatCurrency(totalTargetAmount)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Active Goals
          </div>
          <div className="text-2xl font-semibold mt-1">{goals.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            High Priority
          </div>
          <div className="text-2xl font-semibold mt-1">{highPriorityCount}</div>
        </div>
      </div>

      {/* Sort Controls */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Sort by:</span>
          <div className="flex gap-1">
            {(["priority", "targetDate", "amount"] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  sortBy === option
                    ? "bg-zinc-700 text-zinc-50"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-50"
                }`}
              >
                {option === "priority"
                  ? "Priority"
                  : option === "targetDate"
                  ? "Target Date"
                  : "Amount"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 mb-4">No goals yet</div>
          <Link
            href={`/goals/new${scenarioId ? `?scenarioId=${scenarioId}` : ""}`}
            className="text-sm text-zinc-50 hover:text-zinc-200 underline"
          >
            Add your first goal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGoals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 transition-colors"
            >
              {/* Header with type badge and priority */}
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                    GOAL_TYPE_COLORS[goal.type] || GOAL_TYPE_COLORS.CUSTOM
                  }`}
                >
                  {GOAL_TYPE_LABELS[goal.type] || goal.type}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS[2]
                    }`}
                    title={`${PRIORITY_LABELS[goal.priority] || "Medium"} Priority`}
                  />
                  <span className="text-xs text-zinc-500">
                    {PRIORITY_LABELS[goal.priority] || "Medium"}
                  </span>
                </div>
              </div>

              {/* Goal Name */}
              <Link
                href={`/goals/${goal.id}`}
                className="block font-medium text-lg hover:text-zinc-300 transition-colors mb-2"
              >
                {goal.name}
              </Link>

              {/* Target Amount */}
              <div className="text-2xl font-semibold text-emerald-400 mb-2">
                {formatCurrency(goal.targetAmount)}
              </div>

              {/* Target Date Countdown */}
              <div className="text-sm text-zinc-400 mb-4">
                {getTimeUntil(goal.targetDate)}
              </div>

              {/* Progress Bar - shows 0% for now since account linking comes later */}
              <ProgressBar progress={0} />

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                <Link
                  href={`/goals/${goal.id}/edit`}
                  className="flex-1 text-center px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={deleting === goal.id}
                  className="flex-1 text-center px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting === goal.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
