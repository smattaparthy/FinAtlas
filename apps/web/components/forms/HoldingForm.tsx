"use client";

import { useState } from "react";
import { z } from "zod";

const HoldingFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol too long"),
  name: z.string().nullable(),
  shares: z.number().positive("Shares must be positive"),
  costBasis: z.number().min(0, "Cost basis cannot be negative").nullable(),
});

type HoldingFormData = z.infer<typeof HoldingFormSchema>;

interface HoldingFormProps {
  initialData?: Partial<HoldingFormData> & { id?: string };
  onSubmit: (data: HoldingFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function HoldingForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: HoldingFormProps) {
  const [formData, setFormData] = useState<HoldingFormData>({
    symbol: initialData?.symbol ?? "",
    name: initialData?.name ?? null,
    shares: initialData?.shares ?? 0,
    costBasis: initialData?.costBasis ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function handleChange(
    field: keyof HoldingFormData,
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

    const parsed = HoldingFormSchema.safeParse(formData);
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

  // Calculate total value for display
  const totalValue = formData.shares * (formData.costBasis ?? 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Symbol */}
        <div>
          <label className={labelClass}>Ticker Symbol</label>
          <input
            type="text"
            className={`${inputClass} uppercase`}
            value={formData.symbol}
            onChange={(e) => handleChange("symbol", e.target.value.toUpperCase())}
            placeholder="e.g., VTI, SPY, AAPL"
            maxLength={10}
          />
          {errors.symbol && <p className={errorClass}>{errors.symbol}</p>}
        </div>

        {/* Name */}
        <div>
          <label className={labelClass}>Name (optional)</label>
          <input
            type="text"
            className={inputClass}
            value={formData.name ?? ""}
            onChange={(e) => handleChange("name", e.target.value || null)}
            placeholder="e.g., Vanguard Total Stock Market"
          />
        </div>

        {/* Shares */}
        <div>
          <label className={labelClass}>Number of Shares</label>
          <input
            type="number"
            className={inputClass}
            value={formData.shares || ""}
            onChange={(e) => handleChange("shares", parseFloat(e.target.value) || 0)}
            placeholder="0"
            step="0.0001"
            min="0"
          />
          {errors.shares && <p className={errorClass}>{errors.shares}</p>}
        </div>

        {/* Cost Basis */}
        <div>
          <label className={labelClass}>Cost Basis per Share ($)</label>
          <input
            type="number"
            className={inputClass}
            value={formData.costBasis ?? ""}
            onChange={(e) =>
              handleChange("costBasis", e.target.value ? parseFloat(e.target.value) : null)
            }
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          {errors.costBasis && <p className={errorClass}>{errors.costBasis}</p>}
        </div>
      </div>

      {/* Total Value Display */}
      {formData.shares > 0 && formData.costBasis !== null && formData.costBasis > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="text-xs text-zinc-400">Estimated Value</div>
          <div className="text-lg font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(totalValue)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-zinc-50 px-6 py-2 font-medium text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-60"
        >
          {isLoading ? "Saving..." : initialData?.id ? "Update Holding" : "Add Holding"}
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
