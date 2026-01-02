"use client";

import { useState, useEffect } from "react";
import { z } from "zod";

const AccountTypeOptions = [
  { value: "TRADITIONAL_401K", label: "Traditional 401(k)" },
  { value: "ROTH_401K", label: "Roth 401(k)" },
  { value: "TRADITIONAL_IRA", label: "Traditional IRA" },
  { value: "ROTH_IRA", label: "Roth IRA" },
  { value: "BROKERAGE", label: "Brokerage" },
  { value: "SAVINGS", label: "Savings" },
  { value: "HSA", label: "HSA" },
  { value: "529", label: "529 Plan" },
] as const;

const GrowthRuleOptions = [
  { value: "NONE", label: "No growth" },
  { value: "FIXED", label: "Fixed rate" },
  { value: "INFLATION", label: "Inflation" },
  { value: "INFLATION_PLUS", label: "Inflation + fixed" },
] as const;

const AccountFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["TRADITIONAL_401K", "ROTH_401K", "TRADITIONAL_IRA", "ROTH_IRA", "BROKERAGE", "SAVINGS", "HSA", "529"]),
  balance: z.number().min(0, "Balance cannot be negative"),
  growthRule: z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]),
  growthRate: z.number().nullable(),
  memberId: z.string().nullable(),
});

type AccountFormData = z.infer<typeof AccountFormSchema>;

interface Member {
  id: string;
  name: string;
}

interface AccountFormProps {
  members: Member[];
  initialData?: Partial<AccountFormData> & { id?: string };
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AccountForm({
  members,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialData?.name ?? "",
    type: initialData?.type ?? "BROKERAGE",
    balance: initialData?.balance ?? 0,
    growthRule: initialData?.growthRule ?? "FIXED",
    growthRate: initialData?.growthRate ?? 7,
    memberId: initialData?.memberId ?? null,
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
    field: keyof AccountFormData,
    value: string | number | boolean | null
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

    const parsed = AccountFormSchema.safeParse(formData);
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
          <label className={labelClass}>Account Name</label>
          <input
            type="text"
            className={inputClass}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g., Fidelity 401(k), Vanguard IRA"
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        {/* Account Type */}
        <div>
          <label className={labelClass}>Account Type</label>
          <select
            className={inputClass}
            value={formData.type}
            onChange={(e) => handleChange("type", e.target.value)}
          >
            {AccountTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.type && <p className={errorClass}>{errors.type}</p>}
        </div>

        {/* Member */}
        <div>
          <label className={labelClass}>Account Owner</label>
          <select
            className={inputClass}
            value={formData.memberId ?? ""}
            onChange={(e) => handleChange("memberId", e.target.value || null)}
          >
            <option value="">-- Household --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Balance */}
        <div>
          <label className={labelClass}>Current Balance ($)</label>
          <input
            type="number"
            className={inputClass}
            value={formData.balance || ""}
            onChange={(e) => handleChange("balance", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          {errors.balance && <p className={errorClass}>{errors.balance}</p>}
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
            <label className={labelClass}>Expected Annual Return (%)</label>
            <input
              type="number"
              className={inputClass}
              value={formData.growthRate ?? ""}
              onChange={(e) =>
                handleChange("growthRate", e.target.value ? parseFloat(e.target.value) : null)
              }
              placeholder="e.g., 7.0"
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
          {isLoading ? "Saving..." : initialData?.id ? "Update Account" : "Create Account"}
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
