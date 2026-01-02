"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoanForm from "@/components/forms/LoanForm";

type Member = {
  id: string;
  name: string;
};

type Loan = {
  id: string;
  name: string;
  type: "MORTGAGE" | "AUTO" | "STUDENT" | "PERSONAL" | "HELOC" | "OTHER";
  principal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment?: number;
  startDate: string;
  termMonths: number;
  memberId?: string;
  scenarioId: string;
};

export default function EditLoanPage() {
  const params = useParams();
  const id = params.id as string;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch loan
        const loanRes = await fetch(`/api/loans/${id}`);
        if (!loanRes.ok) {
          throw new Error("Failed to fetch loan");
        }
        const loanData = await loanRes.json();
        setLoan(loanData.loan);

        // Fetch members
        const membersRes = await fetch(`/api/members?scenarioId=${loanData.loan.scenarioId}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "Loan not found"}</div>
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
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/loans"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Loans
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Edit Loan</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update the details of this loan
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <LoanForm
          scenarioId={loan.scenarioId}
          members={members}
          initialData={loan}
          isEdit={true}
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
