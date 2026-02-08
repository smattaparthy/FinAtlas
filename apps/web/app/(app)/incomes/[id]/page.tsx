"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";

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
  COLA: "COLA Adjustment",
  CUSTOM: "Custom",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function IncomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIncome() {
      try {
        const res = await fetch(`/api/incomes/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Income not found");
          } else {
            setError("Failed to load income");
          }
          return;
        }

        const data = await res.json();
        setIncome(data.income);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load income");
      } finally {
        setLoading(false);
      }
    }

    fetchIncome();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Income not found"}</div>
        <Link
          href="/incomes"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Income
        </Link>
      </div>
    );
  }

  const annualTotal = income.amount * (FREQUENCY_MULTIPLIERS[income.frequency] || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/incomes"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            &larr; Back to Income
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold">{income.name}</h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded-lg border bg-blue-500/20 text-blue-400 border-blue-500/30">
              {FREQUENCY_LABELS[income.frequency] || income.frequency}
            </span>
          </div>
          {income.member && (
            <p className="text-zinc-400 text-sm mt-1">{income.member.name}</p>
          )}
        </div>
        <Link
          href={`/incomes/${income.id}/edit`}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Per Payment</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(income.amount)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Annual Total</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(annualTotal)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Frequency</div>
          <div className="text-2xl font-semibold mt-1">
            {FREQUENCY_LABELS[income.frequency] || income.frequency}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Growth Rule</div>
          <div className="text-2xl font-semibold mt-1">
            {GROWTH_RULE_LABELS[income.growthRule] || income.growthRule}
            {income.growthRate !== null && income.growthRate !== 0 && (
              <span className="text-base text-zinc-400 ml-2">
                +{formatPercent(income.growthRate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="font-semibold mb-4">Income Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-zinc-400">Start Date</div>
            <div className="font-medium">{formatDate(income.startDate)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">End Date</div>
            <div className="font-medium">
              {income.endDate ? formatDate(income.endDate) : "Ongoing"}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Taxable</div>
            <div className="font-medium">
              {income.isTaxable ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400">
                  Yes
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-zinc-500/20 text-zinc-400">
                  No
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Member</div>
            <div className="font-medium">{income.member?.name || "Unassigned"}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Growth Rate</div>
            <div className="font-medium">
              {income.growthRate !== null && income.growthRate !== 0
                ? formatPercent(income.growthRate)
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
