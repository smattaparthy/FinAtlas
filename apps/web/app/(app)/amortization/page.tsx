"use client";

import { useState, useEffect, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatAxisDate } from "@/lib/format";
import { generateAmortizationSchedule, calculatePMT } from "@/lib/amortization/amortizationCalculations";
import Link from "next/link";

interface Loan {
  id: string;
  name: string;
  principal: number;
  currentBalance: number;
  interestRate: number; // decimal (e.g., 0.065)
  monthlyPayment: number;
  termMonths: number;
  startDate: string;
}

export default function AmortizationPage() {
  const { selectedScenarioId } = useScenario();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoans() {
      if (!selectedScenarioId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/loans?scenarioId=${selectedScenarioId}`);
        const data = await response.json();
        setLoans(data.loans || []);
        if (data.loans && data.loans.length > 0 && !selectedLoanId) {
          setSelectedLoanId(data.loans[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch loans:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLoans();
  }, [selectedScenarioId]);

  const selectedLoan = useMemo(() => {
    return loans.find((loan) => loan.id === selectedLoanId);
  }, [loans, selectedLoanId]);

  const amortization = useMemo(() => {
    if (!selectedLoan) return null;

    const annualRatePercent = selectedLoan.interestRate * 100;

    return generateAmortizationSchedule(
      selectedLoan.currentBalance,
      annualRatePercent,
      selectedLoan.termMonths,
      selectedLoan.monthlyPayment,
      selectedLoan.startDate
    );
  }, [selectedLoan]);

  const chartData = useMemo(() => {
    if (!amortization || amortization.schedule.length === 0) return null;

    const schedule = amortization.schedule;
    const maxPayment = Math.max(...schedule.map((row) => row.payment));

    // Sample data points for chart (max 50 points for performance)
    const sampleRate = Math.ceil(schedule.length / 50);
    const sampledSchedule = schedule.filter((_, i) => i % sampleRate === 0 || i === schedule.length - 1);

    return {
      points: sampledSchedule.map((row, idx) => ({
        x: (idx / (sampledSchedule.length - 1)) * 100,
        yPrincipal: (row.principal / maxPayment) * 100,
        yInterest: (row.interest / maxPayment) * 100,
        yTotal: (row.payment / maxPayment) * 100,
        date: row.date,
      })),
      maxPayment,
    };
  }, [amortization]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">Amortization Schedule</h1>
          <p className="mt-2 text-sm text-zinc-400">
            View detailed payment breakdowns and payoff timelines
          </p>
        </div>

        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-50">No loans found</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Add a loan to view its amortization schedule.
            </p>
            <Link
              href="/loans/new"
              className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add Loan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!amortization || !selectedLoan) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">Amortization Schedule</h1>
        <p className="mt-2 text-sm text-zinc-400">
          View detailed payment breakdowns and payoff timelines
        </p>
      </div>

      {/* Loan Selector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <label htmlFor="loan-select" className="block text-sm font-medium text-zinc-400 mb-2">
          Select Loan
        </label>
        <select
          id="loan-select"
          value={selectedLoanId}
          onChange={(e) => setSelectedLoanId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {loans.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.name} - {formatCurrency(loan.currentBalance)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-sm text-zinc-400">Monthly Payment</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-50">
            {formatCurrency(amortization.monthlyPayment)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-sm text-zinc-400">Total Interest</div>
          <div className="mt-2 text-2xl font-semibold text-amber-400">
            {formatCurrency(amortization.totalInterest)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-sm text-zinc-400">Total Payments</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-50">
            {formatCurrency(amortization.totalPayments)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-sm text-zinc-400">Payoff Date</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">
            {formatAxisDate(amortization.payoffDate)}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-50 mb-4">
            Payment Breakdown Over Time
          </h2>
          <div className="relative h-[300px]">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              {/* Interest area (amber) */}
              <path
                d={`
                  M 0 ${100 - chartData.points[0].yInterest}
                  ${chartData.points
                    .map((p) => `L ${p.x} ${100 - p.yInterest}`)
                    .join(" ")}
                  L 100 100
                  L 0 100
                  Z
                `}
                fill="#f59e0b"
                opacity="0.6"
              />

              {/* Principal area (emerald) */}
              <path
                d={`
                  M 0 ${100 - chartData.points[0].yTotal}
                  ${chartData.points
                    .map((p) => `L ${p.x} ${100 - p.yTotal}`)
                    .join(" ")}
                  L 100 ${100 - chartData.points[chartData.points.length - 1].yInterest}
                  ${chartData.points
                    .slice()
                    .reverse()
                    .map((p) => `L ${p.x} ${100 - p.yInterest}`)
                    .join(" ")}
                  Z
                `}
                fill="#10b981"
                opacity="0.6"
              />
            </svg>

            {/* Legend */}
            <div className="mt-4 flex gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-emerald-500 opacity-60" />
                <span>Principal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-amber-500 opacity-60" />
                <span>Interest</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amortization Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">
          Payment Schedule
        </h2>
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
              <tr>
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-right">Payment</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Interest</th>
                <th className="py-3 px-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {amortization.schedule.map((row, idx) => (
                <tr
                  key={row.month}
                  className={idx % 2 === 0 ? "bg-zinc-950/40" : "bg-zinc-900/40"}
                >
                  <td className="py-3 px-4">{row.month}</td>
                  <td className="py-3 px-4">{formatAxisDate(row.date)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(row.payment)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {formatCurrency(row.principal)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {formatCurrency(row.interest)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
