"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { GoalForm, type GoalFormData } from "@/components/forms/GoalForm";

function NewGoalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioIdFromUrl = searchParams.get("scenarioId");

  const [scenarioId, setScenarioId] = useState<string | null>(scenarioIdFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(!scenarioIdFromUrl);

  // Fetch scenario ID if not provided in URL
  useEffect(() => {
    if (scenarioIdFromUrl) return;

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
        setLoadingScenario(false);
      }
    }
    fetchScenarioId();
  }, [scenarioIdFromUrl]);

  async function handleSubmit(data: GoalFormData) {
    if (!scenarioId) {
      setError("No scenario selected");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          scenarioId,
          targetDate: data.targetDate
            ? new Date(data.targetDate).toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create goal");
      }

      router.push("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setIsLoading(false);
    }
  }

  if (loadingScenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error && !scenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error}</div>
        <Link
          href="/goals"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Goals
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/goals"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors mb-2 inline-block"
        >
          &larr; Back to Goals
        </Link>
        <h1 className="text-2xl font-semibold">Create New Goal</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Set a financial goal to track your progress
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <GoalForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Create Goal"
        />
      </div>
    </div>
  );
}

export default function NewGoalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }
    >
      <NewGoalContent />
    </Suspense>
  );
}
