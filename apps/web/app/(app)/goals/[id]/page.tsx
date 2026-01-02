"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

type Goal = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
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
  1: "High Priority",
  2: "Medium Priority",
  3: "Low Priority",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTimeUntil(targetDate: string | null): { text: string; color: string } {
  if (!targetDate) return { text: "No target date", color: "text-zinc-400" };

  const target = new Date(targetDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return { text: "Past due", color: "text-red-400" };

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return {
      text: `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`,
      color: diffDays < 7 ? "text-orange-400" : "text-yellow-400",
    };
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return {
      text: `${diffMonths} month${diffMonths !== 1 ? "s" : ""} remaining`,
      color: "text-emerald-400",
    };
  }

  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths > 0) {
    return {
      text: `${diffYears} year${diffYears !== 1 ? "s" : ""}, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""} remaining`,
      color: "text-emerald-400",
    };
  }
  return {
    text: `${diffYears} year${diffYears !== 1 ? "s" : ""} remaining`,
    color: "text-emerald-400",
  };
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-zinc-400">Funding Progress</span>
        <span className="font-medium">{progress.toFixed(0)}%</span>
      </div>
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fetch goal data
  useEffect(() => {
    async function fetchGoal() {
      try {
        const res = await fetch(`/api/goals/${goalId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Goal not found");
          }
          throw new Error("Failed to fetch goal");
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
  }, [goalId]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }
      router.push("/goals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete goal");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading goal...</div>
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

  const timeUntil = getTimeUntil(goal.targetDate);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/goals"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors mb-2 inline-block"
          >
            &larr; Back to Goals
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-lg border ${
                GOAL_TYPE_COLORS[goal.type] || GOAL_TYPE_COLORS.CUSTOM
              }`}
            >
              {GOAL_TYPE_LABELS[goal.type] || goal.type}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS[2]
                }`}
              />
              <span className="text-sm text-zinc-400">
                {PRIORITY_LABELS[goal.priority] || "Medium Priority"}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-semibold mt-3">{goal.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/goals/${goal.id}/edit`}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-xl hover:border-zinc-600 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-zinc-700 rounded-xl hover:border-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Amount Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="text-sm text-zinc-400 mb-2">Target Amount</div>
          <div className="text-4xl font-bold text-emerald-400">
            {formatCurrency(goal.targetAmount)}
          </div>
        </div>

        {/* Time Remaining Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="text-sm text-zinc-400 mb-2">Time Remaining</div>
          <div className={`text-2xl font-semibold ${timeUntil.color}`}>
            {timeUntil.text}
          </div>
          {goal.targetDate && (
            <div className="text-sm text-zinc-500 mt-1">
              Target: {formatDate(goal.targetDate)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <ProgressBar progress={0} />
        <p className="text-sm text-zinc-500 mt-4">
          Account linking will be available in a future update to track funding
          progress automatically.
        </p>
      </div>

      {/* Linked Accounts Section (Future) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-medium mb-4">Linked Accounts</h2>
        <div className="text-center py-8 text-zinc-500">
          <p className="mb-2">No accounts linked to this goal yet.</p>
          <p className="text-sm">
            Account linking will be available in a future update.
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-lg font-medium mb-4">Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">Created</div>
            <div>{formatDate(goal.createdAt)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Last Updated</div>
            <div>{formatDate(goal.updatedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
