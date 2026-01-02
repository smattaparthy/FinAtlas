"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import IncomeForm from "@/components/forms/IncomeForm";

type Member = {
  id: string;
  name: string;
};

type Income = {
  id: string;
  scenarioId: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  growthRule: string;
  growthRate: number | null;
  memberId: string | null;
  isTaxable: boolean;
  member: { id: string; name: string } | null;
  scenario: { id: string; householdId: string };
};

export default function EditIncomePage() {
  const router = useRouter();
  const params = useParams();
  const incomeId = params.id as string;

  const [income, setIncome] = useState<Income | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch income
        const incomeRes = await fetch(`/api/incomes/${incomeId}`);
        if (!incomeRes.ok) {
          if (incomeRes.status === 404) {
            throw new Error("Income not found");
          }
          throw new Error("Failed to fetch income");
        }
        const incomeData = await incomeRes.json();
        setIncome(incomeData.income);

        // Fetch members for the household
        const membersRes = await fetch(`/api/members?scenarioId=${incomeData.income.scenarioId}`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load income");
      } finally {
        setLoading(false);
      }
    }

    if (incomeId) {
      fetchData();
    }
  }, [incomeId]);

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
    setSaving(true);
    try {
      const res = await fetch(`/api/incomes/${incomeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update income");
      }

      router.push("/incomes");
    } catch (err) {
      setSaving(false);
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Income not found"}</div>
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
        <h1 className="text-2xl font-semibold mt-4">Edit Income</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update income source: <span className="text-zinc-300">{income.name}</span>
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <IncomeForm
          scenarioId={income.scenarioId}
          members={members}
          initialData={{
            id: income.id,
            name: income.name,
            amount: income.amount,
            frequency: income.frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME",
            startDate: income.startDate,
            endDate: income.endDate,
            growthRule: income.growthRule as "NONE" | "FIXED" | "INFLATION" | "INFLATION_PLUS",
            growthRate: income.growthRate,
            memberId: income.memberId,
            isTaxable: income.isTaxable,
          }}
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
