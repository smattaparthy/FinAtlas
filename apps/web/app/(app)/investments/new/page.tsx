"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AccountForm from "@/components/forms/AccountForm";

type Member = {
  id: string;
  name: string;
};

function NewAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scenarioId, setScenarioId] = useState<string | null>(searchParams.get("scenarioId"));
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Get scenario if not provided
        if (!scenarioId) {
          const scenarioRes = await fetch("/api/scenarios?limit=1");
          if (scenarioRes.ok) {
            const data = await scenarioRes.json();
            if (data.scenarios?.length > 0) {
              setScenarioId(data.scenarios[0].id);
              // Get members from household
              if (data.scenarios[0].household?.members) {
                setMembers(data.scenarios[0].household.members);
              }
            } else {
              setError("No scenario found. Please create a household first.");
            }
          }
        } else {
          // Fetch scenario with members
          const res = await fetch(`/api/scenarios?limit=1`);
          if (res.ok) {
            const data = await res.json();
            const scenario = data.scenarios?.find((s: { id: string }) => s.id === scenarioId);
            if (scenario?.household?.members) {
              setMembers(scenario.household.members);
            }
          }
        }
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [scenarioId]);

  async function handleSubmit(formData: {
    name: string;
    type: string;
    balance: number;
    growthRule: string;
    growthRate: number | null;
    memberId: string | null;
  }) {
    if (!scenarioId) {
      throw new Error("No scenario selected");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scenarioId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      router.push("/investments");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error}</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/investments"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          &larr; Back to Investments
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h1 className="text-xl font-semibold mb-6">Add Investment Account</h1>
        <AccountForm
          members={members}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/investments")}
          isLoading={submitting}
        />
      </div>
    </div>
  );
}

export default function NewAccountPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-zinc-400">Loading...</div></div>}>
      <NewAccountContent />
    </Suspense>
  );
}
