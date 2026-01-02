"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import CSVImportWizard from "@/components/import/CSVImportWizard";

type Income = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  growthRule: string;
  growthRate: number | null;
  isTaxable: boolean;
  member: { id: string; name: string } | null;
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Bi-weekly",
  WEEKLY: "Weekly",
  ANNUAL: "Annual",
  ONE_TIME: "One-time",
};

const GROWTH_RULE_LABELS: Record<string, string> = {
  NONE: "No growth",
  FIXED: "Fixed",
  INFLATION: "Inflation",
  INFLATION_PLUS: "Inflation+",
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
    month: "short",
    day: "numeric",
  });
}

function annualizedAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "ANNUAL":
      return amount;
    case "MONTHLY":
      return amount * 12;
    case "BIWEEKLY":
      return amount * 26;
    case "WEEKLY":
      return amount * 52;
    case "ONE_TIME":
      return amount;
    default:
      return amount;
  }
}

export default function IncomesPage() {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchIncomes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/incomes?scenarioId=${selectedScenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch incomes");
        }
        const data = await res.json();
        setIncomes(data.incomes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incomes");
      } finally {
        setLoading(false);
      }
    }
    fetchIncomes();
  }, [selectedScenarioId]);

  async function handleDelete(incomeId: string) {
    if (!confirm("Are you sure you want to delete this income?")) return;

    setDeleting(incomeId);
    try {
      const res = await fetch(`/api/incomes/${incomeId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete income");
      }
      setIncomes(incomes.filter((i) => i.id !== incomeId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete income");
    } finally {
      setDeleting(null);
    }
  }

  async function handleImportComplete(count: number) {
    setShowImport(false);
    if (count > 0 && selectedScenarioId) {
      // Refresh the incomes list
      const res = await fetch(`/api/incomes?scenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setIncomes(data.incomes);
      }
    }
  }

  // Calculate totals
  const totalAnnualIncome = incomes.reduce(
    (sum, income) => sum + annualizedAmount(income.amount, income.frequency),
    0
  );
  const taxableIncome = incomes
    .filter((i) => i.isTaxable)
    .reduce((sum, income) => sum + annualizedAmount(income.amount, income.frequency), 0);

  if (scenarioLoading || (loading && selectedScenarioId)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading incomes...</div>
      </div>
    );
  }

  if (scenarioError || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{scenarioError || error}</div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">No scenario selected. Please create a household and scenario first.</div>
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
          <h1 className="text-2xl font-semibold">Incomes</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your income sources and streams</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Import CSV
          </button>
          <Link
            href={`/incomes/new?scenarioId=${selectedScenarioId}`}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            Add Income
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && selectedScenarioId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CSVImportWizard
              type="income"
              scenarioId={selectedScenarioId}
              onComplete={handleImportComplete}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Annual Income</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalAnnualIncome)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Taxable Income</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(taxableIncome)}</div>
          {totalAnnualIncome > 0 && (
            <div className="text-xs text-zinc-500 mt-1">
              {((taxableIncome / totalAnnualIncome) * 100).toFixed(0)}% of total
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Income Sources</div>
          <div className="text-2xl font-semibold mt-1">{incomes.length}</div>
        </div>
      </div>

      {/* Incomes List */}
      {incomes.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 mb-4">No income sources yet</div>
          <Link
            href={`/incomes/new?scenarioId=${selectedScenarioId}`}
            className="text-sm text-zinc-50 hover:text-zinc-200 underline"
          >
            Add your first income source
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Member</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Frequency</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Start Date</th>
                <th className="px-4 py-3 font-medium hidden xl:table-cell">Growth</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {incomes.map((income) => (
                <tr key={income.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{income.name}</span>
                      {income.isTaxable ? (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Taxable
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          Non-taxable
                        </span>
                      )}
                    </div>
                    {/* Mobile: show member name below */}
                    {income.member && (
                      <div className="text-xs text-zinc-500 mt-0.5 md:hidden">
                        {income.member.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                    {income.member?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium">{formatCurrency(income.amount)}</div>
                    <div className="text-xs text-zinc-500 lg:hidden">
                      {FREQUENCY_LABELS[income.frequency] || income.frequency}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                    {FREQUENCY_LABELS[income.frequency] || income.frequency}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                    <div>{formatDate(income.startDate)}</div>
                    {income.endDate && (
                      <div className="text-xs text-zinc-500">
                        to {formatDate(income.endDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden xl:table-cell">
                    {GROWTH_RULE_LABELS[income.growthRule] || income.growthRule}
                    {income.growthRate && income.growthRule !== "NONE" && (
                      <span className="text-zinc-500"> @ {income.growthRate}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/incomes/${income.id}/edit`}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(income.id)}
                        disabled={deleting === income.id}
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleting === income.id ? "..." : "Delete"}
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
}
