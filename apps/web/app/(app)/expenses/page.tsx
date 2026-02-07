"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import CSVImportWizard from "@/components/import/CSVImportWizard";

type Expense = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  growthRule: string;
  growthRate: number | null;
  category: string | null;
  isDiscretionary: boolean;
};

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Transportation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Food: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Utilities: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Healthcare: "bg-red-500/20 text-red-400 border-red-500/30",
  Insurance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Personal: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Education: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Other: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Bi-weekly",
  WEEKLY: "Weekly",
  ANNUAL: "Annual",
  ONE_TIME: "One-time",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function annualizeAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount * 12;
    case "BIWEEKLY":
      return amount * 26;
    case "WEEKLY":
      return amount * 52;
    case "ANNUAL":
      return amount;
    case "ONE_TIME":
      return amount;
    default:
      return amount;
  }
}

function groupByCategory(expenses: Expense[]): Record<string, Expense[]> {
  const groups: Record<string, Expense[]> = {};
  for (const expense of expenses) {
    const cat = expense.category || "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(expense);
  }
  return groups;
}

export default function ExpensesPage() {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);

  // Fetch expenses
  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchExpenses() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/expenses?scenarioId=${selectedScenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch expenses");
        }
        const data = await res.json();
        setExpenses(data.expenses);
        // Expand all categories by default
        const categories = new Set(data.expenses.map((e: Expense) => e.category || "Uncategorized"));
        setExpandedCategories(categories as Set<string>);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expenses");
      } finally {
        setLoading(false);
      }
    }
    fetchExpenses();
  }, [selectedScenarioId]);

  async function handleDelete(expenseId: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setDeleting(expenseId);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete expense");
      }
      setExpenses(expenses.filter((e) => e.id !== expenseId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeleting(null);
    }
  }

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  async function handleImportComplete(count: number) {
    setShowImport(false);
    if (count > 0 && selectedScenarioId) {
      const res = await fetch(`/api/expenses?selectedScenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses);
        const categories = new Set(data.expenses.map((e: Expense) => e.category || "Uncategorized"));
        setExpandedCategories(categories as Set<string>);
      }
    }
  }

  // Filter expenses
  const filteredExpenses =
    categoryFilter === "all"
      ? expenses
      : expenses.filter((e) => (e.category || "Uncategorized") === categoryFilter);

  // Group by category
  const groupedExpenses = groupByCategory(filteredExpenses);
  const categories = Object.keys(groupedExpenses).sort();
  const allCategories = [...new Set(expenses.map((e) => e.category || "Uncategorized"))].sort();

  // Calculate totals
  const totalMonthly = expenses.reduce((sum, e) => {
    const annual = annualizeAmount(e.amount, e.frequency);
    return sum + annual / 12;
  }, 0);

  const totalAnnual = expenses.reduce((sum, e) => {
    return sum + annualizeAmount(e.amount, e.frequency);
  }, 0);

  const discretionaryTotal = expenses
    .filter((e) => e.isDiscretionary)
    .reduce((sum, e) => sum + annualizeAmount(e.amount, e.frequency), 0);

  if (scenarioLoading || (loading && selectedScenarioId)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading expenses...</div>
      </div>
    );
  }

  if (scenarioError || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{scenarioError || error}</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">No scenario selected. Please create a household and scenario first.</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
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
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-zinc-400 text-sm mt-1">Track and manage your household expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Import CSV
          </button>
          <Link
            href={`/expenses/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            Add Expense
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && selectedScenarioId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CSVImportWizard
              type="expense"
              selectedScenarioId={selectedScenarioId}
              onComplete={handleImportComplete}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Monthly Total</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalMonthly)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Annual Total</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalAnnual)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Discretionary</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(discretionaryTotal / 12)}/mo</div>
          <div className="text-xs text-zinc-500 mt-1">
            {totalAnnual > 0 ? ((discretionaryTotal / totalAnnual) * 100).toFixed(1) : 0}% of total
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Expense Count</div>
          <div className="text-2xl font-semibold mt-1">{expenses.length}</div>
          <div className="text-xs text-zinc-500 mt-1">{allCategories.length} categories</div>
        </div>
      </div>

      {/* Filter */}
      {allCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400">Filter:</span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              categoryFilter === "all"
                ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-50 hover:border-zinc-600"
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                categoryFilter === cat
                  ? "bg-zinc-50 text-zinc-950 border-zinc-50"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-50 hover:border-zinc-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Expenses List - Grouped by Category */}
      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 mb-4">No expenses yet</div>
          <Link
            href={`/expenses/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
            className="text-sm text-zinc-50 hover:text-zinc-200 underline"
          >
            Add your first expense
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryExpenses = groupedExpenses[category];
            const categoryTotal = categoryExpenses.reduce(
              (sum, e) => sum + annualizeAmount(e.amount, e.frequency) / 12,
              0
            );
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                        CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
                      }`}
                    >
                      {category}
                    </span>
                    <span className="text-sm text-zinc-400">{categoryExpenses.length} expenses</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatCurrency(categoryTotal)}/mo</span>
                    <span className="text-zinc-500">{isExpanded ? "−" : "+"}</span>
                  </div>
                </button>

                {/* Category Expenses Table */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-zinc-500 uppercase tracking-wide">
                          <th className="px-4 py-2 text-left font-medium">Name</th>
                          <th className="px-4 py-2 text-right font-medium">Amount</th>
                          <th className="px-4 py-2 text-center font-medium">Frequency</th>
                          <th className="px-4 py-2 text-center font-medium">Type</th>
                          <th className="px-4 py-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {categoryExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link
                                href={`/expenses/${expense.id}/edit`}
                                className="font-medium hover:text-zinc-300 transition-colors"
                              >
                                {expense.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(expense.amount)}</td>
                            <td className="px-4 py-3 text-center text-sm text-zinc-400">
                              {FREQUENCY_LABELS[expense.frequency] || expense.frequency}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {expense.isDiscretionary ? (
                                <span className="px-2 py-0.5 text-xs rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Discretionary
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs rounded-lg bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
                                  Essential
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/expenses/${expense.id}/edit`}
                                  className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDelete(expense.id)}
                                  disabled={deleting === expense.id}
                                  className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                                >
                                  {deleting === expense.id ? "..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
