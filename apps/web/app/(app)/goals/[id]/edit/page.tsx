"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GoalForm, type GoalFormData } from "@/components/forms/GoalForm";

type Goal = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
};

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGoal, setLoadingGoal] = useState(true);

  // Fetch goal data
  useEffect(() => {
    async function fetchGoal() {
      try {
        const res = await fetch(`/api/goals/${goalId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Goal not found");
          }
          throw new Error("Failed to fetch goal");
        }
        const data = await res.json();
        setGoal(data.goal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goal");
      } finally {
        setLoadingGoal(false);
      }
    }
    fetchGoal();
  }, [goalId]);

  async function handleSubmit(data: GoalFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          targetDate: data.targetDate
            ? new Date(data.targetDate).toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update goal");
      }

      router.push("/goals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update goal");
    } finally {
      setIsLoading(false);
    }
  }

  if (loadingGoal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading goal...</div>
      </div>
    );
  }

  if (error && !goal) {
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

  // Format the target date for the form input (YYYY-MM-DD format)
  const formattedTargetDate = goal?.targetDate
    ? new Date(goal.targetDate).toISOString().split("T")[0]
    : undefined;

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
        <h1 className="text-2xl font-semibold">Edit Goal</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update your financial goal details
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {goal && (
          <GoalForm
            initialData={{
              name: goal.name,
              type: goal.type as GoalFormData["type"],
              targetAmount: goal.targetAmount,
              targetDate: formattedTargetDate,
              priority: goal.priority,
            }}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel="Update Goal"
          />
        )}
      </div>
    </div>
  );
}
