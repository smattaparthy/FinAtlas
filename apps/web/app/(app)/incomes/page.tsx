"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import CSVImportWizard from "@/components/import/CSVImportWizard";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";

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
  const toast = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    setConfirmDeleteId(null);
    setDeleting(incomeId);
    try {
      const res = await fetch(`/api/incomes/${incomeId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete income");
      }
      setIncomes(incomes.filter((i) => i.id !== incomeId));
      toast.success("Income deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete income");
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
    return <PageSkeleton />;
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Annual Income</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalAnnualIncome)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Taxable Income</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(taxableIncome)}</div>
          {totalAnnualIncome > 0 && (
            <div className="text-xs text-zinc-500 mt-1">
              {((taxableIncome / totalAnnualIncome) * 100).toFixed(0)}% of total
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Income Sources</div>
          <div className="text-2xl font-semibold mt-1">{incomes.length}</div>
        </div>
      </div>

      {/* Incomes List */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Income"
        description="Are you sure you want to delete this income source? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {incomes.length === 0 ? (
        <EmptyState
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}
          title="No income sources yet"
          description="Add your first income source to start projecting your financial future."
          actionLabel="Add Income"
          actionHref={`/incomes/new?scenarioId=${selectedScenarioId}`}
        />
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
                      <span className="text-zinc-500"> @ {(income.growthRate * 100).toFixed(1)}%</span>
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
                        onClick={() => setConfirmDeleteId(income.id)}
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
