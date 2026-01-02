"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ExpenseForm } from "@/components/forms/ExpenseForm";

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
  scenarioId: string;
};

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch expense
        const expenseRes = await fetch(`/api/expenses/${id}`);
        if (!expenseRes.ok) {
          throw new Error("Failed to fetch expense");
        }
        const expenseData = await expenseRes.json();
        setExpense(expenseData.expense);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Expense not found"}</div>
        <Link
          href="/expenses"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/expenses"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Edit Expense</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update the details of this expense
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <ExpenseForm
          scenarioId={expense.scenarioId}
          initialData={expense}
          mode="edit"
        />
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}
