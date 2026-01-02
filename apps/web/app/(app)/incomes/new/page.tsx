"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import IncomeForm from "@/components/forms/IncomeForm";
import { useScenario } from "@/contexts/ScenarioContext";

type Member = {
  id: string;
  name: string;
};

export default function NewIncomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedScenarioId, selectedScenario, isLoading: scenarioLoading } = useScenario();

  const scenarioIdParam = searchParams.get("scenarioId");
  const scenarioId = scenarioIdParam || selectedScenarioId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scenarioId) {
      setLoading(false);
      return;
    }

    async function fetchMembers() {
      setLoading(true);
      try {
        const res = await fetch(`/api/members?scenarioId=${scenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch household members");
        }
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [scenarioId]);

  async function handleSubmit(data: {
    name: string;
    amount: number;
    frequency: string;
    startDate: string;
    endDate: string | null;
    growthRule: string;
    growthRate: number | null;
    memberId: string | null;
    isTaxable: boolean;
  }) {
    if (!scenarioId) {
      throw new Error("No scenario selected");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, scenarioId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create income");
      }

      router.push("/incomes");
    } catch (err) {
      setSaving(false);
      throw err;
    }
  }

  if (scenarioLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!scenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">No scenario selected. Please create a household and scenario first.</div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error}</div>
        <Link
          href="/incomes"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Incomes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/incomes"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Incomes
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Add Income</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Add a new income source to your financial plan
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <IncomeForm
          scenarioId={scenarioId}
          members={members}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/incomes")}
          isLoading={saving}
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
