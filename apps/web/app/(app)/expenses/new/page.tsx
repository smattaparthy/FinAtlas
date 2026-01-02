"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import Link from "next/link";

export default function NewExpensePage() {
  const searchParams = useSearchParams();
  const [scenarioId, setScenarioId] = useState<string | null>(searchParams.get("scenarioId"));
  const [loading, setLoading] = useState(!scenarioId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scenarioId) return;

    async function fetchScenarioId() {
      try {
        const res = await fetch("/api/scenarios?limit=1");
        if (res.ok) {
          const data = await res.json();
          if (data.scenarios?.length > 0) {
            setScenarioId(data.scenarios[0].id);
          } else {
            setError("No scenario found. Please create a household and scenario first.");
          }
        } else {
          setError("Unable to load scenarios.");
        }
      } catch {
        setError("Failed to load scenarios");
      } finally {
        setLoading(false);
      }
    }
    fetchScenarioId();
  }, [scenarioId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !scenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "No scenario available"}</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Go to Dashboard
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
        <h1 className="text-xl font-semibold mb-1">Add New Expense</h1>
        <p className="text-sm text-zinc-400 mb-6">Track a recurring or one-time expense</p>

        <ExpenseForm scenarioId={scenarioId} mode="create" />
      </div>
    </div>
  );
}
