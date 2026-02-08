"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type Goal = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
  scenarioId: string;
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  RETIREMENT: "Retirement",
  EDUCATION: "Education",
  MAJOR_PURCHASE: "Major Purchase",
  EMERGENCY_FUND: "Emergency Fund",
  CUSTOM: "Custom",
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  RETIREMENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EDUCATION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MAJOR_PURCHASE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  EMERGENCY_FUND: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CUSTOM: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-400",
  2: "text-amber-400",
  3: "text-emerald-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGoal() {
      try {
        const res = await fetch(`/api/goals/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Goal not found");
          } else {
            setError("Failed to load goal");
          }
          return;
        }

        const data = await res.json();
        setGoal(data.goal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goal");
      } finally {
        setLoading(false);
      }
    }

    fetchGoal();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Goal not found"}</div>
        <Link
          href="/goals"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Goals
        </Link>
      </div>
    );
  }

  const typeColor = GOAL_TYPE_COLORS[goal.type] || GOAL_TYPE_COLORS.CUSTOM;
  const priorityLabel = PRIORITY_LABELS[goal.priority] || "Medium";
  const priorityColor = PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS[2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/goals"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            &larr; Back to Goals
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold">{goal.name}</h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${typeColor}`}>
              {GOAL_TYPE_LABELS[goal.type] || goal.type}
            </span>
          </div>
        </div>
        <Link
          href={`/goals/${goal.id}/edit`}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Target Amount</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(goal.targetAmount)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Target Date</div>
          <div className="text-2xl font-semibold mt-1">
            {goal.targetDate ? formatDate(goal.targetDate) : "No deadline"}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Priority</div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${priorityColor.replace("text-", "bg-")}`}></div>
            <div className={`text-2xl font-semibold ${priorityColor}`}>{priorityLabel}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Type</div>
          <div className="text-2xl font-semibold mt-1">
            {GOAL_TYPE_LABELS[goal.type] || goal.type}
          </div>
        </div>
      </div>

      {/* Goal Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="font-semibold mb-4">Goal Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-zinc-400">Name</div>
            <div className="font-medium">{goal.name}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Type</div>
            <div className="font-medium">{GOAL_TYPE_LABELS[goal.type] || goal.type}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Target Amount</div>
            <div className="font-medium">{formatCurrency(goal.targetAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Target Date</div>
            <div className="font-medium">
              {goal.targetDate ? formatDate(goal.targetDate) : "No deadline"}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Priority</div>
            <div className={`font-medium ${priorityColor}`}>{priorityLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
