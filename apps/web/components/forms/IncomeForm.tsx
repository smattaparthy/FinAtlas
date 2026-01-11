"use client";

import { useState, useEffect } from "react";
import { z } from "zod";

const FrequencyOptions = [
  { value: "ANNUAL", label: "Annual" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "ONE_TIME", label: "One-time" },
] as const;

const GrowthRuleOptions = [
  { value: "NONE", label: "No growth" },
  { value: "FIXED", label: "Fixed rate" },
  { value: "INFLATION", label: "Inflation" },
  { value: "INFLATION_PLUS", label: "Inflation + fixed" },
] as const;

const IncomeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable(),
  growthRule: z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]),
  growthRate: z.number().nullable(),
  memberId: z.string().nullable(),
  isTaxable: z.boolean(),
});

type IncomeFormData = z.infer<typeof IncomeFormSchema>;

interface Member {
  id: string;
  name: string;
}

interface IncomeFormProps {
  scenarioId: string;
  members: Member[];
  initialData?: Partial<IncomeFormData> & { id?: string };
  onSubmit: (data: IncomeFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export default function IncomeForm({
  scenarioId,
  members,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: IncomeFormProps) {
  const [formData, setFormData] = useState<IncomeFormData>({
    name: initialData?.name ?? "",
    amount: initialData?.amount ?? 0,
    frequency: initialData?.frequency ?? "ANNUAL",
    startDate: formatDateForInput(initialData?.startDate) || new Date().toISOString().split("T")[0],
    endDate: formatDateForInput(initialData?.endDate) || null,
    growthRule: initialData?.growthRule ?? "NONE",
    // Convert decimal (0.02) to percentage (2) for display
    growthRate: initialData?.growthRate !== null && initialData?.growthRate !== undefined
      ? initialData.growthRate * 100
      : null,
    memberId: initialData?.memberId ?? null,
    isTaxable: initialData?.isTaxable ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const showGrowthRate = formData.growthRule === "FIXED" || formData.growthRule === "INFLATION_PLUS";

  useEffect(() => {
    if (!showGrowthRate && formData.growthRate !== null) {
      setFormData((prev) => ({ ...prev, growthRate: null }));
    }
  }, [showGrowthRate, formData.growthRate]);

  function handleChange(
    field: keyof IncomeFormData,
    value: string | number | boolean | null
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const parsed = IncomeFormSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      // Convert percentage (2) back to decimal (0.02) for database storage
      const dataToSubmit = {
        ...parsed.data,
        growthRate: parsed.data.growthRate !== null
          ? parsed.data.growthRate / 100
          : null,
      };
      await onSubmit(dataToSubmit);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 text-zinc-50";
  const labelClass = "text-xs text-zinc-400";
  const errorClass = "text-xs text-red-400 mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="md:col-span-2">
          <label className={labelClass}>Name</label>
          <input
            type="text"
            className={inputClass}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g., Salary, Freelance Income"
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        {/* Amount */}
        <div>
          <label className={labelClass}>Amount ($)</label>
          <input
            type="number"
            className={inputClass}
            value={formData.amount || ""}
            onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          {errors.amount && <p className={errorClass}>{errors.amount}</p>}
        </div>

        {/* Frequency */}
        <div>
          <label className={labelClass}>Frequency</label>
          <select
            className={inputClass}
            value={formData.frequency}
            onChange={(e) => handleChange("frequency", e.target.value)}
          >
            {FrequencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.frequency && <p className={errorClass}>{errors.frequency}</p>}
        </div>

        {/* Member */}
        <div>
          <label className={labelClass}>Household Member</label>
          <select
            className={inputClass}
            value={formData.memberId ?? ""}
            onChange={(e) => handleChange("memberId", e.target.value || null)}
          >
            <option value="">-- None --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Is Taxable */}
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="isTaxable"
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-zinc-50 focus:ring-zinc-600"
            checked={formData.isTaxable}
            onChange={(e) => handleChange("isTaxable", e.target.checked)}
          />
          <label htmlFor="isTaxable" className="text-sm text-zinc-300">
            Taxable Income
          </label>
        </div>

        {/* Start Date */}
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            type="date"
            className={inputClass}
            value={formData.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
          />
          {errors.startDate && <p className={errorClass}>{errors.startDate}</p>}
        </div>

        {/* End Date */}
        <div>
          <label className={labelClass}>End Date (optional)</label>
          <input
            type="date"
            className={inputClass}
            value={formData.endDate ?? ""}
            onChange={(e) => handleChange("endDate", e.target.value || null)}
          />
        </div>

        {/* Growth Rule */}
        <div>
          <label className={labelClass}>Growth Rule</label>
          <select
            className={inputClass}
            value={formData.growthRule}
            onChange={(e) => handleChange("growthRule", e.target.value)}
          >
            {GrowthRuleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Growth Rate */}
        {showGrowthRate && (
          <div>
            <label className={labelClass}>Growth Rate (%)</label>
            <input
              type="number"
              className={inputClass}
              value={formData.growthRate ?? ""}
              onChange={(e) =>
                handleChange("growthRate", e.target.value ? parseFloat(e.target.value) : null)
              }
              placeholder="e.g., 3.0"
              step="0.1"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-zinc-50 px-6 py-2 font-medium text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-60"
        >
          {isLoading ? "Saving..." : initialData?.id ? "Update Income" : "Create Income"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-xl border border-zinc-700 px-6 py-2 font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
