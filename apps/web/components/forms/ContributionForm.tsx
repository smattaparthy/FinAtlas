"use client";

import { useState } from "react";
import { z } from "zod";

const FrequencyOptions = [
  { value: "ANNUAL", label: "Annual" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "ONE_TIME", label: "One-time" },
] as const;

const ContributionFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable(),
  employerMatch: z.number().min(0).max(100).nullable(),
  employerMatchLimit: z.number().min(0).nullable(),
});

type ContributionFormData = z.infer<typeof ContributionFormSchema>;

interface ContributionFormProps {
  accountType?: string;
  initialData?: Partial<ContributionFormData> & { id?: string };
  onSubmit: (data: ContributionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// Check if account type supports employer matching
function supportsEmployerMatch(type?: string): boolean {
  return type === "TRADITIONAL_401K" || type === "ROTH_401K";
}

export default function ContributionForm({
  accountType,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ContributionFormProps) {
  const [formData, setFormData] = useState<ContributionFormData>({
    amount: initialData?.amount ?? 0,
    frequency: initialData?.frequency ?? "ANNUAL",
    startDate: formatDateForInput(initialData?.startDate) || new Date().toISOString().split("T")[0],
    endDate: formatDateForInput(initialData?.endDate) || null,
    employerMatch: initialData?.employerMatch ?? null,
    employerMatchLimit: initialData?.employerMatchLimit ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const showEmployerMatch = supportsEmployerMatch(accountType);

  function handleChange(
    field: keyof ContributionFormData,
    value: string | number | null
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const parsed = ContributionFormSchema.safeParse(formData);
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
      await onSubmit(parsed.data);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 text-zinc-50";
  const labelClass = "text-xs text-zinc-400";
  const errorClass = "text-xs text-red-400 mt-1";

  // Calculate annual contribution for display
  const getAnnualAmount = (): number => {
    const amount = formData.amount;
    switch (formData.frequency) {
      case "WEEKLY":
        return amount * 52;
      case "BIWEEKLY":
        return amount * 26;
      case "MONTHLY":
        return amount * 12;
      case "ANNUAL":
      case "ONE_TIME":
        return amount;
      default:
        return amount;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label className={labelClass}>Contribution Amount ($)</label>
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

        {/* Employer Match - only for 401k accounts */}
        {showEmployerMatch && (
          <>
            <div>
              <label className={labelClass}>Employer Match (%)</label>
              <input
                type="number"
                className={inputClass}
                value={formData.employerMatch ?? ""}
                onChange={(e) =>
                  handleChange("employerMatch", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g., 50 for 50% match"
                step="1"
                min="0"
                max="100"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Percentage of your contribution that employer matches
              </p>
            </div>

            <div>
              <label className={labelClass}>Match Limit ($)</label>
              <input
                type="number"
                className={inputClass}
                value={formData.employerMatchLimit ?? ""}
                onChange={(e) =>
                  handleChange("employerMatchLimit", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g., 6000"
                step="100"
                min="0"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Maximum annual employer match amount
              </p>
            </div>
          </>
        )}
      </div>

      {/* Annual Summary */}
      {formData.amount > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="text-xs text-zinc-400">Annual Contribution</div>
          <div className="text-lg font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(getAnnualAmount())}
          </div>
          {showEmployerMatch && formData.employerMatch && formData.employerMatch > 0 && (
            <div className="text-xs text-emerald-400 mt-1">
              + Up to{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(
                formData.employerMatchLimit
                  ? Math.min(getAnnualAmount() * (formData.employerMatch / 100), formData.employerMatchLimit)
                  : getAnnualAmount() * (formData.employerMatch / 100)
              )}{" "}
              employer match
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-zinc-50 px-6 py-2 font-medium text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-60"
        >
          {isLoading ? "Saving..." : initialData?.id ? "Update Contribution" : "Add Contribution"}
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
