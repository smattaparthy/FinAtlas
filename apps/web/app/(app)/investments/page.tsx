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

type Holding = {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
};

type Contribution = {
  id: string;
  amount: number;
  frequency: string;
};

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  growthRule: string;
  growthRate: number | null;
  member: { id: string; name: string } | null;
  holdings: Holding[];
  contributions: Contribution[];
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  TRADITIONAL_401K: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ROTH_401K: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  TRADITIONAL_IRA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ROTH_IRA: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  BROKERAGE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SAVINGS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  HSA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "529": "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TRADITIONAL_401K: "401(k)",
  ROTH_401K: "Roth 401(k)",
  TRADITIONAL_IRA: "Trad IRA",
  ROTH_IRA: "Roth IRA",
  BROKERAGE: "Brokerage",
  SAVINGS: "Savings",
  HSA: "HSA",
  "529": "529",
};

function formatPercent(rate: number): string {
  // rate comes in as decimal (0.07 = 7%), Intl.NumberFormat handles the conversion
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate);
}

export default function InvestmentsPage() {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScenarioId) return;

    const abortController = new AbortController();

    async function fetchAccounts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts?scenarioId=${selectedScenarioId}`, { signal: abortController.signal });
        if (!res.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const data = await res.json();
        setAccounts(data.accounts);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load accounts");
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
    return () => abortController.abort();
  }, [selectedScenarioId]);

  async function handleDelete(accountId: string) {
    setConfirmDeleteId(null);
    setDeleting(accountId);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete account");
      }
      setAccounts(accounts.filter((a) => a.id !== accountId));
      toast.success("Account deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(null);
    }
  }

  async function handleImportComplete(count: number) {
    setShowImport(false);
    if (count > 0 && selectedScenarioId) {
      const res = await fetch(`/api/accounts?scenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalContributions = accounts.reduce(
    (sum, acc) =>
      sum +
      acc.contributions
        .filter((c) => c.frequency === "MONTHLY")
        .reduce((s, c) => s + c.amount, 0),
    0
  );

  // Group by tax treatment
  const taxDeferred = accounts.filter((a) =>
    ["TRADITIONAL_401K", "TRADITIONAL_IRA"].includes(a.type)
  );
  const taxFree = accounts.filter((a) =>
    ["ROTH_401K", "ROTH_IRA", "HSA"].includes(a.type)
  );
  const taxable = accounts.filter((a) =>
    ["BROKERAGE", "SAVINGS", "529"].includes(a.type)
  );

  if (loading) {
    return <PageSkeleton />;
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
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-zinc-400 text-sm mt-1">Track your investment accounts and holdings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Import CSV
          </button>
          <Link
            href={`/investments/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            Add Account
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && selectedScenarioId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CSVImportWizard
              type="account"
              scenarioId={selectedScenarioId}
              onComplete={handleImportComplete}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Value</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Monthly Contributions</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalContributions)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Accounts</div>
          <div className="text-2xl font-semibold mt-1">{accounts.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Tax Treatment</div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-purple-400">{taxDeferred.length} Deferred</span>
            <span className="text-emerald-400">{taxFree.length} Free</span>
            <span className="text-amber-400">{taxable.length} Taxable</span>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Account"
        description="Are you sure you want to delete this investment account? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <EmptyState
          icon="chart-bar"
          title="No investment accounts yet"
          description="Start tracking your investment accounts and holdings"
          actionLabel="Add your first account"
          actionHref={`/investments/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
        />
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                      ACCOUNT_TYPE_COLORS[account.type] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                    }`}
                  >
                    {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                  </span>
                  <div>
                    <Link
                      href={`/investments/${account.id}`}
                      className="font-medium hover:text-zinc-300 transition-colors"
                    >
                      {account.name}
                    </Link>
                    {account.member && (
                      <div className="text-xs text-zinc-500 mt-0.5">{account.member.name}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/investments/${account.id}/edit`}
                    className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(account.id)}
                    disabled={deleting === account.id}
                    className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting === account.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Balance</div>
                  <div className="font-medium">{formatCurrency(account.balance)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Expected Return</div>
                  <div className="font-medium">
                    {account.growthRate !== null ? formatPercent(account.growthRate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Holdings</div>
                  <div className="font-medium">{account.holdings.length}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Contributions</div>
                  <div className="font-medium">{account.contributions.length}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
