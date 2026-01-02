"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

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

type AmortizationRow = {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(rate: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  monthlyPayment: number,
  startDate: Date
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;

  for (let month = 1; month <= termMonths && balance > 0; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principalPaid);

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);

    schedule.push({
      month,
      date: date.toISOString().split("T")[0],
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return schedule;
}

function calculatePayoffWithExtra(
  currentBalance: number,
  annualRate: number,
  monthlyPayment: number,
  extraPayment: number
): { months: number; interestSaved: number; originalInterest: number } {
  const monthlyRate = annualRate / 100 / 12;

  // Calculate original payoff
  let balance = currentBalance;
  let originalMonths = 0;
  let originalInterest = 0;
  while (balance > 0 && originalMonths < 600) {
    const interest = balance * monthlyRate;
    originalInterest += interest;
    balance = Math.max(0, balance - (monthlyPayment - interest));
    originalMonths++;
  }

  // Calculate payoff with extra
  balance = currentBalance;
  let newMonths = 0;
  let newInterest = 0;
  const totalPayment = monthlyPayment + extraPayment;
  while (balance > 0 && newMonths < 600) {
    const interest = balance * monthlyRate;
    newInterest += interest;
    balance = Math.max(0, balance - (totalPayment - interest));
    newMonths++;
  }

  return {
    months: newMonths,
    interestSaved: originalInterest - newInterest,
    originalInterest,
  };
}

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [extraPayment, setExtraPayment] = useState("");

  useEffect(() => {
    async function fetchLoan() {
      try {
        const res = await fetch(`/api/loans/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Loan not found");
          } else {
            setError("Failed to load loan");
          }
          return;
        }

        const data = await res.json();
        setLoan(data.loan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load loan");
      } finally {
        setLoading(false);
      }
    }

    fetchLoan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Loan not found"}</div>
        <Link
          href="/loans"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Loans
        </Link>
      </div>
    );
  }

  const schedule = generateAmortizationSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.monthlyPayment,
    new Date(loan.startDate)
  );

  // Find months already paid
  const startDate = new Date(loan.startDate);
  const now = new Date();
  const monthsPaid = Math.max(0, Math.floor(
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth())
  ));

  const remainingSchedule = schedule.slice(monthsPaid);
  const displaySchedule = showFullSchedule ? remainingSchedule : remainingSchedule.slice(0, 12);

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const remainingInterest = remainingSchedule.reduce((sum, row) => sum + row.interest, 0);

  // Calculate payoff date
  const payoffDate = new Date(loan.startDate);
  payoffDate.setMonth(payoffDate.getMonth() + loan.termMonths);

  // Extra payment calculations
  const extraPaymentAmount = parseFloat(extraPayment) || 0;
  const extraPaymentCalc = extraPaymentAmount > 0
    ? calculatePayoffWithExtra(
        loan.currentBalance,
        loan.interestRate,
        loan.monthlyPayment,
        extraPaymentAmount
      )
    : null;

  // Payoff progress
  const paidOff = loan.principal - loan.currentBalance;
  const percentPaid = loan.principal > 0 ? (paidOff / loan.principal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/loans"
            className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            &larr; Back to Loans
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold">{loan.name}</h1>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                LOAN_TYPE_COLORS[loan.type] || LOAN_TYPE_COLORS.OTHER
              }`}
            >
              {LOAN_TYPE_LABELS[loan.type] || loan.type}
            </span>
          </div>
          {loan.member && (
            <p className="text-zinc-400 text-sm mt-1">{loan.member.name}</p>
          )}
        </div>
        <Link
          href={`/loans/${loan.id}/edit`}
          className="px-4 py-2 border border-zinc-700 rounded-xl font-medium hover:border-zinc-600 transition-colors"
        >
          Edit Loan
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Current Balance</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(loan.currentBalance)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Monthly Payment</div>
          <div className="text-xl font-semibold mt-1">{formatCurrency(loan.monthlyPayment)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Interest Rate</div>
          <div className="text-xl font-semibold mt-1">{formatPercent(loan.interestRate)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Payoff Date</div>
          <div className="text-xl font-semibold mt-1">{formatDate(payoffDate.toISOString())}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Payoff Progress</h2>
          <span className="text-sm text-zinc-400">
            {formatCurrency(paidOff)} of {formatCurrency(loan.principal)} paid
          </span>
        </div>
        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(percentPaid, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-zinc-400 mt-2">
          <span>{percentPaid.toFixed(1)}% complete</span>
          <span>{remainingSchedule.length} payments remaining</span>
        </div>
      </div>

      {/* Extra Payment Calculator */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="font-semibold mb-4">Extra Payment Calculator</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm text-zinc-400">Extra Monthly Payment ($)</label>
            <input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(e.target.value)}
              placeholder="100"
              min="0"
              step="10"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>
          {extraPaymentCalc && (
            <div className="flex-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-400">New Payoff Time</div>
                <div className="font-semibold text-emerald-400">
                  {Math.floor(extraPaymentCalc.months / 12)}y {extraPaymentCalc.months % 12}m
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Interest Saved</div>
                <div className="font-semibold text-emerald-400">
                  {formatCurrency(extraPaymentCalc.interestSaved)}
                </div>
              </div>
            </div>
          )}
        </div>
        {extraPaymentCalc && (
          <div className="mt-4 text-sm text-zinc-400">
            Without extra payments: Total interest of {formatCurrency(extraPaymentCalc.originalInterest)}
          </div>
        )}
      </div>

      {/* Loan Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="font-semibold mb-4">Loan Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-zinc-400">Original Principal</div>
            <div className="font-medium">{formatCurrency(loan.principal)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Start Date</div>
            <div className="font-medium">{formatDate(loan.startDate)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Term</div>
            <div className="font-medium">
              {Math.floor(loan.termMonths / 12)} years, {loan.termMonths % 12} months
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Total Interest</div>
            <div className="font-medium">{formatCurrency(totalInterest)}</div>
          </div>
        </div>
      </div>

      {/* Amortization Schedule */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Amortization Schedule</h2>
          <div className="text-sm text-zinc-400">
            Remaining interest: {formatCurrency(remainingInterest)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-400 border-b border-zinc-800">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Payment</th>
                <th className="pb-2 font-medium text-right">Principal</th>
                <th className="pb-2 font-medium text-right">Interest</th>
                <th className="pb-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {displaySchedule.map((row) => (
                <tr key={row.month} className="text-zinc-300">
                  <td className="py-2">{row.month}</td>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2 text-right">{formatCurrency(row.payment)}</td>
                  <td className="py-2 text-right text-emerald-400">{formatCurrency(row.principal)}</td>
                  <td className="py-2 text-right text-amber-400">{formatCurrency(row.interest)}</td>
                  <td className="py-2 text-right">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {remainingSchedule.length > 12 && (
          <button
            onClick={() => setShowFullSchedule(!showFullSchedule)}
            className="mt-4 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            {showFullSchedule
              ? "Show less"
              : `Show all ${remainingSchedule.length} payments`}
          </button>
        )}
      </div>
    </div>
  );
}
