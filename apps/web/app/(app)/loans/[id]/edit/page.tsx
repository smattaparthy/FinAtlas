"use client";

import { useEffect, useState, use } from "react";
import LoanForm from "@/components/forms/LoanForm";
import Link from "next/link";

type Member = {
  id: string;
  name: string;
};

type Loan = {
  id: string;
  scenarioId: string;
  memberId: string | null;
  name: string;
  type: "MORTGAGE" | "AUTO" | "STUDENT" | "PERSONAL" | "HELOC" | "OTHER";
  principal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  termMonths: number;
};

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch the loan
        const loanRes = await fetch(`/api/loans/${id}`);
        if (!loanRes.ok) {
          if (loanRes.status === 404) {
            setError("Loan not found");
          } else {
            setError("Failed to load loan");
          }
          setLoading(false);
          return;
        }

        const loanData = await loanRes.json();
        setLoan(loanData.loan);

        // Fetch members for the scenario's household
        const membersRes = await fetch(`/api/members?scenarioId=${loanData.loan.scenarioId}`);
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
      <div className="mb-6">
        <Link
          href="/loans"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          &larr; Back to Loans
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Edit Loan</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Update details for {loan.name}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <LoanForm
          scenarioId={loan.scenarioId}
          members={members}
          isEdit={true}
          initialData={{
            id: loan.id,
            name: loan.name,
            type: loan.type,
            principal: loan.principal,
            currentBalance: loan.currentBalance,
            interestRate: loan.interestRate,
            monthlyPayment: loan.monthlyPayment,
            startDate: loan.startDate,
            termMonths: loan.termMonths,
            memberId: loan.memberId,
          }}
        />
      </div>
    </div>
  );
}
