"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import LoanForm from "@/components/forms/LoanForm";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
};

export default function NewLoanPage() {
  const searchParams = useSearchParams();
  const scenarioIdParam = searchParams.get("scenarioId");

  const [scenarioId, setScenarioId] = useState<string | null>(scenarioIdParam);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // If no scenarioId provided, try to get one
        let sid = scenarioIdParam;

        if (!sid) {
          const scenarioRes = await fetch("/api/scenarios?limit=1");
          if (scenarioRes.ok) {
            const data = await scenarioRes.json();
            if (data.scenarios?.length > 0) {
              sid = data.scenarios[0].id;
              setScenarioId(sid);
            }
          }
        }

        if (!sid) {
          setError("No scenario found. Please create a household and scenario first.");
          setLoading(false);
          return;
        }

        // Fetch members for the scenario's household
        const membersRes = await fetch(`/api/members?scenarioId=${sid}`);
        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members || []);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    }

    fetchData();
  }, [scenarioIdParam]);

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
        <Link
          href="/loans"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Loans
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/loans"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          &larr; Back to Loans
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Add New Loan</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Track a mortgage, auto loan, student loan, or other debt
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <LoanForm scenarioId={scenarioId} members={members} />
      </div>
    </div>
  );
}
