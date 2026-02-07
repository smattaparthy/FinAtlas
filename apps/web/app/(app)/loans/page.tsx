"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import CSVImportWizard from "@/components/import/CSVImportWizard";

type Loan = {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  termMonths: number;
  member: { id: string; name: string } | null;
};

const LOAN_TYPE_COLORS: Record<string, string> = {
  MORTGAGE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  AUTO: "bg-green-500/20 text-green-400 border-green-500/30",
  STUDENT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PERSONAL: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  HELOC: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  OTHER: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  MORTGAGE: "Mortgage",
  AUTO: "Auto",
  STUDENT: "Student",
  PERSONAL: "Personal",
  HELOC: "HELOC",
  OTHER: "Other",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(rate: number): string {
  // rate comes in as decimal (0.045 = 4.5%), Intl.NumberFormat handles the conversion
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

function PayoffProgressBar({ principal, currentBalance }: { principal: number; currentBalance: number }) {
  const paidOff = principal - currentBalance;
  const percentPaid = principal > 0 ? (paidOff / principal) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Paid off: {formatCurrency(paidOff)}</span>
        <span>{percentPaid.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.min(percentPaid, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function LoansPage() {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchLoans() {
      setLoading(true);
      try {
        const res = await fetch(`/api/loans?scenarioId=${selectedScenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch loans");
        }
        const data = await res.json();
        setLoans(data.loans);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load loans");
      } finally {
        setLoading(false);
      }
    }
    fetchLoans();
  }, [selectedScenarioId]);

  async function handleDelete(loanId: string) {
    if (!confirm("Are you sure you want to delete this loan?")) return;

    setDeleting(loanId);
    try {
      const res = await fetch(`/api/loans/${loanId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete loan");
      }
      setLoans(loans.filter((l) => l.id !== loanId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete loan");
    } finally {
      setDeleting(null);
    }
  }

  async function handleImportComplete(count: number) {
    setShowImport(false);
    if (count > 0 && selectedScenarioId) {
      const res = await fetch(`/api/loans?selectedScenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setLoans(data.loans);
      }
    }
  }

  // Calculate totals
  const totalDebt = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading loans...</div>
      </div>
    );
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
          <h1 className="text-2xl font-semibold">Loans</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your debt and track payoff progress</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Import CSV
          </button>
          <Link
            href={`/loans/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            Add Loan
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && selectedScenarioId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CSVImportWizard
              type="loan"
              selectedScenarioId={selectedScenarioId}
              onComplete={handleImportComplete}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Debt</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalDebt)}</div>
          {totalPrincipal > 0 && (
            <div className="text-xs text-emerald-400 mt-1">
              {((1 - totalDebt / totalPrincipal) * 100).toFixed(1)}% paid off
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Monthly Payments</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrency(totalMonthlyPayment)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Active Loans</div>
          <div className="text-2xl font-semibold mt-1">{loans.length}</div>
        </div>
      </div>

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 mb-4">No loans yet</div>
          <Link
            href={`/loans/new${selectedScenarioId ? `?selectedScenarioId=${selectedScenarioId}` : ""}`}
            className="text-sm text-zinc-50 hover:text-zinc-200 underline"
          >
            Add your first loan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                      LOAN_TYPE_COLORS[loan.type] || LOAN_TYPE_COLORS.OTHER
                    }`}
                  >
                    {LOAN_TYPE_LABELS[loan.type] || loan.type}
                  </span>
                  <div>
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-medium hover:text-zinc-300 transition-colors"
                    >
                      {loan.name}
                    </Link>
                    {loan.member && (
                      <div className="text-xs text-zinc-500 mt-0.5">{loan.member.name}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/loans/${loan.id}/edit`}
                    className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(loan.id)}
                    disabled={deleting === loan.id}
                    className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting === loan.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-zinc-500">Current Balance</div>
                  <div className="font-medium">{formatCurrency(loan.currentBalance)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Interest Rate</div>
                  <div className="font-medium">{formatPercent(loan.interestRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Monthly Payment</div>
                  <div className="font-medium">{formatCurrency(loan.monthlyPayment)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Original Principal</div>
                  <div className="font-medium">{formatCurrency(loan.principal)}</div>
                </div>
              </div>

              <PayoffProgressBar principal={loan.principal} currentBalance={loan.currentBalance} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
