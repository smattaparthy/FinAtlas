"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const LoanTypeEnum = z.enum(["MORTGAGE", "AUTO", "STUDENT", "PERSONAL", "HELOC", "OTHER"]);
type LoanType = z.infer<typeof LoanTypeEnum>;

const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: LoanTypeEnum,
  principal: z.number().positive("Principal must be positive"),
  currentBalance: z.number().min(0, "Current balance cannot be negative"),
  interestRate: z.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%"),
  monthlyPayment: z.number().min(0, "Monthly payment cannot be negative").optional(),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.number().int().positive("Term must be positive"),
  memberId: z.string().optional().nullable(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

type Member = {
  id: string;
  name: string;
};

type LoanFormProps = {
  scenarioId: string;
  initialData?: Partial<LoanFormData> & { id?: string };
  members?: Member[];
  isEdit?: boolean;
};

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "AUTO", label: "Auto Loan" },
  { value: "STUDENT", label: "Student Loan" },
  { value: "PERSONAL", label: "Personal Loan" },
  { value: "HELOC", label: "HELOC" },
  { value: "OTHER", label: "Other" },
];

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export default function LoanForm({ scenarioId, initialData, members = [], isEdit = false }: LoanFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<LoanType>(initialData?.type || "OTHER");
  const [principal, setPrincipal] = useState(initialData?.principal?.toString() || "");
  const [currentBalance, setCurrentBalance] = useState(initialData?.currentBalance?.toString() || "");
  const [interestRate, setInterestRate] = useState(initialData?.interestRate?.toString() || "");
  const [monthlyPayment, setMonthlyPayment] = useState(initialData?.monthlyPayment?.toString() || "");
  const [startDate, setStartDate] = useState(formatDateForInput(initialData?.startDate));
  const [termMonths, setTermMonths] = useState(initialData?.termMonths?.toString() || "");
  const [memberId, setMemberId] = useState(initialData?.memberId || "");

  const [autoCalculate, setAutoCalculate] = useState(!initialData?.monthlyPayment);

  // Auto-calculate monthly payment
  useEffect(() => {
    if (!autoCalculate) return;

    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const t = parseInt(termMonths);

    if (p > 0 && r >= 0 && t > 0) {
      const calculated = calculateMonthlyPayment(p, r, t);
      setMonthlyPayment(calculated.toFixed(2));
    }
  }, [principal, interestRate, termMonths, autoCalculate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData: LoanFormData = {
      name,
      type,
      principal: parseFloat(principal) || 0,
      currentBalance: parseFloat(currentBalance) || 0,
      interestRate: parseFloat(interestRate) || 0,
      monthlyPayment: parseFloat(monthlyPayment) || undefined,
      startDate,
      termMonths: parseInt(termMonths) || 0,
      memberId: memberId || null,
    };

    const validation = loanFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const url = isEdit && initialData?.id
        ? `/api/loans/${initialData.id}`
        : "/api/loans";

      const method = isEdit ? "PUT" : "POST";

      const body = isEdit
        ? validation.data
        : { ...validation.data, scenarioId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save loan");
      }

      router.push("/loans");
      router.refresh();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save loan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400">Loan Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Primary Mortgage, Car Loan"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.name && <div className="text-xs text-red-400 mt-1">{errors.name}</div>}
        </div>

        {/* Type */}
        <div>
          <label className="text-sm text-zinc-400">Loan Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LoanType)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          >
            {LOAN_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
          {errors.type && <div className="text-xs text-red-400 mt-1">{errors.type}</div>}
        </div>

        {/* Member */}
        <div>
          <label className="text-sm text-zinc-400">Household Member (optional)</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          >
            <option value="">No specific member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Principal */}
        <div>
          <label className="text-sm text-zinc-400">Original Principal ($)</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="250000"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.principal && <div className="text-xs text-red-400 mt-1">{errors.principal}</div>}
        </div>

        {/* Current Balance */}
        <div>
          <label className="text-sm text-zinc-400">Current Balance ($)</label>
          <input
            type="number"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="230000"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.currentBalance && <div className="text-xs text-red-400 mt-1">{errors.currentBalance}</div>}
        </div>

        {/* Interest Rate */}
        <div>
          <label className="text-sm text-zinc-400">Annual Interest Rate (%)</label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="6.5"
            min="0"
            max="100"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.interestRate && <div className="text-xs text-red-400 mt-1">{errors.interestRate}</div>}
        </div>

        {/* Term Months */}
        <div>
          <label className="text-sm text-zinc-400">Loan Term (months)</label>
          <input
            type="number"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
            placeholder="360"
            min="1"
            step="1"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          <div className="text-xs text-zinc-500 mt-1">
            {termMonths && parseInt(termMonths) > 0
              ? `${Math.floor(parseInt(termMonths) / 12)} years, ${parseInt(termMonths) % 12} months`
              : "Common: 360 (30yr), 180 (15yr), 60 (5yr)"}
          </div>
          {errors.termMonths && <div className="text-xs text-red-400 mt-1">{errors.termMonths}</div>}
        </div>

        {/* Start Date */}
        <div>
          <label className="text-sm text-zinc-400">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.startDate && <div className="text-xs text-red-400 mt-1">{errors.startDate}</div>}
        </div>

        {/* Monthly Payment */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-zinc-400">Monthly Payment ($)</label>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
                className="rounded border-zinc-700"
              />
              Auto-calculate
            </label>
          </div>
          <input
            type="number"
            value={monthlyPayment}
            onChange={(e) => {
              setMonthlyPayment(e.target.value);
              setAutoCalculate(false);
            }}
            placeholder="1580.17"
            min="0"
            step="0.01"
            disabled={autoCalculate}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {errors.monthlyPayment && <div className="text-xs text-red-400 mt-1">{errors.monthlyPayment}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving..." : isEdit ? "Update Loan" : "Create Loan"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-zinc-700 rounded-xl font-medium hover:border-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
