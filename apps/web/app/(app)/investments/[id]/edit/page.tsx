"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AccountForm from "@/components/forms/AccountForm";

type Member = {
  id: string;
  name: string;
};

type AccountData = {
  id: string;
  name: string;
  type: "TRADITIONAL_401K" | "ROTH_401K" | "TRADITIONAL_IRA" | "ROTH_IRA" | "BROKERAGE" | "SAVINGS" | "HSA" | "529";
  balance: number;
  growthRule: "NONE" | "FIXED" | "INFLATION" | "INFLATION_PLUS";
  growthRate: number | null;
  memberId: string | null;
};

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch account
        const accountRes = await fetch(`/api/accounts/${accountId}`);
        if (!accountRes.ok) {
          throw new Error("Failed to fetch account");
        }
        const accountData = await accountRes.json();
        setAccount({
          id: accountData.account.id,
          name: accountData.account.name,
          type: accountData.account.type,
          balance: accountData.account.balance,
          growthRule: accountData.account.growthRule,
          growthRate: accountData.account.growthRate,
          memberId: accountData.account.memberId,
        });

        // Fetch members from scenarios
        const scenarioRes = await fetch("/api/scenarios?limit=1");
        if (scenarioRes.ok) {
          const scenarioData = await scenarioRes.json();
          if (scenarioData.scenarios?.[0]?.household?.members) {
            setMembers(scenarioData.scenarios[0].household.members);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [accountId]);

  async function handleSubmit(formData: {
    name: string;
    type: string;
    balance: number;
    growthRule: string;
    growthRate: number | null;
    memberId: string | null;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update account");
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

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Account not found"}</div>
        <Link href="/investments" className="text-sm text-zinc-400 hover:text-zinc-50">
          Back to Investments
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
        <h1 className="text-xl font-semibold mb-6">Edit Account</h1>
        <AccountForm
          members={members}
          initialData={account}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/investments")}
          isLoading={submitting}
        />
      </div>
    </div>
  );
}
