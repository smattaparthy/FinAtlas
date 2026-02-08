"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";

type Expense = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  growthRule: string;
  growthRate: number | null;
  category: string;
  isDiscretionary: boolean;
  scenarioId: string;
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Bi-Weekly",
  WEEKLY: "Weekly",
  ANNUAL: "Annual",
  ONE_TIME: "One-Time",
};

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ANNUAL: 1,
  ONE_TIME: 1,
};

const GROWTH_RULE_LABELS: Record<string, string> = {
  NONE: "No Growth",
  FIXED: "Fixed Rate",
  INFLATION: "Inflation",
  CUSTOM: "Custom",
};

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Transportation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Food: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Healthcare: "bg-red-500/20 text-red-400 border-red-500/30",
  Insurance: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Education: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Utilities: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpense() {
      try {
        const res = await fetch(`/api/expenses/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Expense not found");
          } else {
            setError("Failed to load expense");
          }
          return;
        }

        const data = await res.json();
        setExpense(data.expense);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expense");
      } finally {
        setLoading(false);
      }
    }

    fetchExpense();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Expense not found"}</div>
        <Link
          href="/expenses"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Expenses
        </Link>
      </div>
    );
  }

  const annualTotal = expense.amount * (FREQUENCY_MULTIPLIERS[expense.frequency] || 1);
  const monthlyAmount = annualTotal / 12;
  const categoryColor = CATEGORY_COLORS[expense.category] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/expenses"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            &larr; Back to Expenses
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold">{expense.name}</h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${categoryColor}`}>
              {expense.category || "Uncategorized"}
            </span>
          </div>
        </div>
        <Link
          href={`/expenses/${expense.id}/edit`}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Monthly</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(monthlyAmount)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Annual Total</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(annualTotal)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Category</div>
          <div className="text-2xl font-semibold mt-1">
            {expense.category || "Uncategorized"}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Expense Type</div>
          <div className="text-2xl font-semibold mt-1">
            {expense.isDiscretionary ? (
              <span className="text-purple-400">Discretionary</span>
            ) : (
              <span className="text-blue-400">Essential</span>
            )}
          </div>
        </div>
      </div>

      {/* Expense Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="font-semibold mb-4">Expense Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-zinc-400">Frequency</div>
            <div className="font-medium">
              {FREQUENCY_LABELS[expense.frequency] || expense.frequency}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Start Date</div>
            <div className="font-medium">{formatDate(expense.startDate)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">End Date</div>
            <div className="font-medium">
              {expense.endDate ? formatDate(expense.endDate) : "Ongoing"}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Growth Rule</div>
            <div className="font-medium">
              {GROWTH_RULE_LABELS[expense.growthRule] || expense.growthRule}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Growth Rate</div>
            <div className="font-medium">
              {expense.growthRate !== null && expense.growthRate !== 0
                ? formatPercent(expense.growthRate)
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
