"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NetWorthChart from "@/components/charts/NetWorthChart";
import { formatCurrency } from "@/lib/format";

interface SharedData {
  scenarioName: string;
  summary: {
    netWorth: number;
    totalAssets: number;
    totalDebt: number;
    annualIncome: number;
    annualExpenses: number;
    incomeCount: number;
    expenseCount: number;
    accountCount: number;
    loanCount: number;
    goalCount: number;
  };
  projection: Array<{ t: string; v: number }>;
  milestones: Array<{ date: string; name: string; color: string }>;
}

export default function SharedViewPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSharedData() {
      try {
        const res = await fetch(`/api/shared/${token}`);
        if (res.status === 404) {
          setError("This share link is invalid or has been revoked.");
          return;
        }
        if (res.status === 410) {
          setError("This share link has expired.");
          return;
        }
        if (!res.ok) {
          setError("Failed to load shared report.");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load shared report.");
      } finally {
        setLoading(false);
      }
    }
    fetchSharedData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="text-zinc-400">Loading shared report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">{error}</div>
          <p className="text-zinc-500 text-sm">
            The link may have expired or been revoked by the owner.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              Shared via FinAtlas
            </span>
          </div>
          <h1 className="text-2xl font-semibold">{data.scenarioName}</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Read-only financial projection report
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Net Worth" value={formatCurrency(data.summary.netWorth)} />
          <SummaryCard label="Total Assets" value={formatCurrency(data.summary.totalAssets)} />
          <SummaryCard label="Total Debt" value={formatCurrency(data.summary.totalDebt)} />
          <SummaryCard label="Annual Income" value={formatCurrency(data.summary.annualIncome)} />
          <SummaryCard
            label="Annual Expenses"
            value={formatCurrency(data.summary.annualExpenses)}
          />
          <SummaryCard
            label="Accounts"
            value={`${data.summary.accountCount} accounts, ${data.summary.loanCount} loans`}
          />
        </div>

        {/* Projection Chart */}
        {data.projection.length > 1 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Net Worth Projection</h2>
            <NetWorthChart
              series={data.projection}
              height={250}
              milestones={data.milestones}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 mt-8 pt-4 border-t border-zinc-800">
          Shared via FinAtlas · Privacy-first financial planning
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
