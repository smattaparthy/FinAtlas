"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AccountForm from "@/components/forms/AccountForm";

type Member = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
  type: "TRADITIONAL_401K" | "ROTH_401K" | "TRADITIONAL_IRA" | "ROTH_IRA" | "BROKERAGE" | "SAVINGS" | "HSA" | "529";
  balance: number;
  growthRule: "NONE" | "FIXED" | "INFLATION" | "INFLATION_PLUS";
  growthRate: number | null;
  memberId: string | null;
  scenarioId: string;
};

export default function EditInvestmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch account
        const accountRes = await fetch(`/api/accounts/${id}`);
        if (!accountRes.ok) {
          throw new Error("Failed to fetch investment account");
        }
        const accountData = await accountRes.json();
        setAccount(accountData.account);

        // Fetch members
        const membersRes = await fetch(`/api/members?scenarioId=${accountData.account.scenarioId}`);
        if (!membersRes.ok) {
          throw new Error("Failed to fetch household members");
        }
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleSubmit(data: {
    name: string;
    type: string;
    balance: number;
    growthRule: string;
    growthRate: number | null;
    memberId: string | null;
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update investment account");
      }

      router.push("/investments");
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

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Investment account not found"}</div>
        <Link
          href="/investments"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Back to Investments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/investments"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Investments
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Edit Investment Account</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update the details of this investment account
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <AccountForm
          members={members}
          initialData={account}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/investments")}
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
