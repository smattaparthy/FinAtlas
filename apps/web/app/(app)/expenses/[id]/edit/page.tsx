"use client";

import { useEffect, useState, use } from "react";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import Link from "next/link";

type ExpenseData = {
  id: string;
  scenarioId: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  growthRule: string;
  growthRate: number | null;
  category: string | null;
  isDiscretionary: boolean;
};

export default function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpense() {
      try {
        const res = await fetch(`/api/expenses/${resolvedParams.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Expense not found");
          } else if (res.status === 403) {
            setError("You don't have permission to edit this expense");
          } else {
            throw new Error("Failed to fetch expense");
          }
          return;
        }
        const data = await res.json();
        // Format dates for form input
        const formattedExpense = {
          ...data.expense,
          startDate: data.expense.startDate ? data.expense.startDate.split("T")[0] : "",
          endDate: data.expense.endDate ? data.expense.endDate.split("T")[0] : null,
        };
        setExpense(formattedExpense);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expense");
      } finally {
        setLoading(false);
      }
    }
    fetchExpense();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading expense...</div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Expense not found"}</div>
        <Link href="/expenses" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Back to Expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/expenses" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          ← Back to Expenses
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h1 className="text-xl font-semibold mb-1">Edit Expense</h1>
        <p className="text-sm text-zinc-400 mb-6">Update expense details</p>

        <ExpenseForm
          scenarioId={expense.scenarioId}
          initialData={expense}
          mode="edit"
        />
      </div>
    </div>
  );
}
