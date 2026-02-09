"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import HoldingForm from "@/components/forms/HoldingForm";
import ContributionForm from "@/components/forms/ContributionForm";
import HoldingsTable from "@/components/investments/HoldingsTable";

type Holding = {
  id: string;
  symbol: string;
  name: string | null;
  shares: number;
  costBasis: number | null;
};

type Contribution = {
  id: string;
  amount: number;
  frequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME";
  employerMatch: number | null;
  employerMatchLimit: number | null;
  startDate: string;
  endDate: string | null;
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

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TRADITIONAL_401K: "Traditional 401(k)",
  ROTH_401K: "Roth 401(k)",
  TRADITIONAL_IRA: "Traditional IRA",
  ROTH_IRA: "Roth IRA",
  BROKERAGE: "Brokerage",
  SAVINGS: "Savings",
  HSA: "HSA",
  "529": "529 Plan",
};

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  ANNUAL: "Annually",
  ONE_TIME: "One-time",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(rate: number): string {
  // rate comes in as decimal (0.07 = 7%), Intl.NumberFormat handles the conversion
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate);
}

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<string | null>(null);
  const [deletingContribution, setDeletingContribution] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await fetch(`/api/accounts/${accountId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch account");
        }
        const data = await res.json();
        setAccount(data.account);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, [accountId]);

  async function handleAddHolding(data: {
    symbol: string;
    name: string | null;
    shares: number;
    costBasis: number | null;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add holding");
      const result = await res.json();
      setAccount((prev) =>
        prev ? { ...prev, holdings: [...prev.holdings, result.holding] } : prev
      );
      setShowHoldingForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateHolding(data: {
    symbol: string;
    name: string | null;
    shares: number;
    costBasis: number | null;
  }) {
    if (!editingHolding) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/holdings/${editingHolding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update holding");
      const result = await res.json();
      setAccount((prev) =>
        prev
          ? {
              ...prev,
              holdings: prev.holdings.map((h) =>
                h.id === editingHolding.id ? result.holding : h
              ),
            }
          : prev
      );
      setEditingHolding(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteHolding(holdingId: string) {
    if (!confirm("Delete this holding?")) return;
    setDeletingHolding(holdingId);
    try {
      const res = await fetch(`/api/accounts/${accountId}/holdings/${holdingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete holding");
      setAccount((prev) =>
        prev ? { ...prev, holdings: prev.holdings.filter((h) => h.id !== holdingId) } : prev
      );
    } finally {
      setDeletingHolding(null);
    }
  }

  async function handleAddContribution(data: {
    amount: number;
    frequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME";
    employerMatch: number | null;
    employerMatchLimit: number | null;
    startDate: string;
    endDate: string | null;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add contribution");
      const result = await res.json();
      setAccount((prev) =>
        prev ? { ...prev, contributions: [...prev.contributions, result.contribution] } : prev
      );
      setShowContributionForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateContribution(data: {
    amount: number;
    frequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME";
    employerMatch: number | null;
    employerMatchLimit: number | null;
    startDate: string;
    endDate: string | null;
  }) {
    if (!editingContribution) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/accounts/${accountId}/contributions/${editingContribution.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to update contribution");
      const result = await res.json();
      setAccount((prev) =>
        prev
          ? {
              ...prev,
              contributions: prev.contributions.map((c) =>
                c.id === editingContribution.id ? result.contribution : c
              ),
            }
          : prev
      );
      setEditingContribution(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteContribution(contributionId: string) {
    if (!confirm("Delete this contribution?")) return;
    setDeletingContribution(contributionId);
    try {
      const res = await fetch(`/api/accounts/${accountId}/contributions/${contributionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contribution");
      setAccount((prev) =>
        prev
          ? { ...prev, contributions: prev.contributions.filter((c) => c.id !== contributionId) }
          : prev
      );
    } finally {
      setDeletingContribution(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading account...</div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Account not found"}</div>
        <Link href="/investments" className="text-sm text-zinc-400 hover:text-zinc-50">
          Back to Investments
        </Link>
      </div>
    );
  }

  const totalCostBasis = account.holdings.reduce((sum, h) => sum + (h.costBasis ?? 0), 0);
  const annualContributions = account.contributions.reduce((sum, c) => {
    const multipliers: Record<string, number> = {
      WEEKLY: 52,
      BIWEEKLY: 26,
      MONTHLY: 12,
      ANNUAL: 1,
      ONE_TIME: 1,
    };
    return sum + c.amount * (multipliers[c.frequency] || 12);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/investments"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            &larr; Back to Investments
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{account.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-zinc-400">
              {ACCOUNT_TYPE_LABELS[account.type] || account.type}
            </span>
            {account.member && (
              <span className="text-sm text-zinc-500">• {account.member.name}</span>
            )}
          </div>
        </div>
        <Link
          href={`/investments/${account.id}/edit`}
          className="px-4 py-2 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Edit Account
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase">Balance</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(account.balance)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase">Expected Return</div>
          <div className="text-2xl font-semibold mt-1">
            {account.growthRate !== null ? formatPercent(account.growthRate) : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase">Cost Basis</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalCostBasis)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase">Annual Contributions</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(annualContributions)}</div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Holdings</h2>
          <button
            onClick={() => setShowHoldingForm(true)}
            className="px-3 py-1.5 text-sm bg-zinc-50 text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Add Holding
          </button>
        </div>

        {showHoldingForm && (
          <div className="mb-4 p-4 border border-zinc-700 rounded-xl">
            <h3 className="text-sm font-medium mb-3">New Holding</h3>
            <HoldingForm
              onSubmit={handleAddHolding}
              onCancel={() => setShowHoldingForm(false)}
              isLoading={submitting}
            />
          </div>
        )}

        {editingHolding && (
          <div className="mb-4 p-4 border border-zinc-700 rounded-xl">
            <h3 className="text-sm font-medium mb-3">Edit Holding</h3>
            <HoldingForm
              initialData={editingHolding}
              onSubmit={handleUpdateHolding}
              onCancel={() => setEditingHolding(null)}
              isLoading={submitting}
            />
          </div>
        )}

        <HoldingsTable
          holdings={account.holdings}
          onRefresh={() => {
            // Optionally refetch account data
          }}
        />

        {/* Management Buttons */}
        {account.holdings.length > 0 && (
          <div className="mt-4 space-y-2">
            {account.holdings.map((holding) => (
              <div
                key={holding.id}
                className="flex items-center justify-between p-3 border border-zinc-800/50 rounded-xl bg-zinc-900/20"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium text-sm">{holding.symbol}</div>
                    {holding.name && holding.name !== holding.symbol && (
                      <div className="text-xs text-zinc-500">{holding.name}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingHolding(holding)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteHolding(holding.id)}
                    disabled={deletingHolding === holding.id}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg disabled:opacity-50"
                  >
                    {deletingHolding === holding.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contributions Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contributions</h2>
          <button
            onClick={() => setShowContributionForm(true)}
            className="px-3 py-1.5 text-sm bg-zinc-50 text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Add Contribution
          </button>
        </div>

        {showContributionForm && (
          <div className="mb-4 p-4 border border-zinc-700 rounded-xl">
            <h3 className="text-sm font-medium mb-3">New Contribution</h3>
            <ContributionForm
              accountType={account.type}
              onSubmit={handleAddContribution}
              onCancel={() => setShowContributionForm(false)}
              isLoading={submitting}
            />
          </div>
        )}

        {editingContribution && (
          <div className="mb-4 p-4 border border-zinc-700 rounded-xl">
            <h3 className="text-sm font-medium mb-3">Edit Contribution</h3>
            <ContributionForm
              accountType={account.type}
              initialData={editingContribution}
              onSubmit={handleUpdateContribution}
              onCancel={() => setEditingContribution(null)}
              isLoading={submitting}
            />
          </div>
        )}

        {account.contributions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No contributions configured yet.</p>
        ) : (
          <div className="space-y-2">
            {account.contributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="font-medium">{formatCurrency(contribution.amount)}</div>
                  <div className="text-sm text-zinc-400">
                    {FREQUENCY_LABELS[contribution.frequency] || contribution.frequency}
                  </div>
                  {contribution.employerMatch !== null && contribution.employerMatch > 0 && (
                    <div className="text-sm text-emerald-400">
                      +{contribution.employerMatch}% match
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingContribution(contribution)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteContribution(contribution.id)}
                    disabled={deletingContribution === contribution.id}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg disabled:opacity-50"
                  >
                    {deletingContribution === contribution.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
