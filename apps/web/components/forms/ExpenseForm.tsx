"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One-time" },
] as const;

const GROWTH_RULE_OPTIONS = [
  { value: "NONE", label: "No Growth" },
  { value: "FIXED", label: "Fixed Rate" },
  { value: "INFLATION", label: "Inflation" },
  { value: "INFLATION_PLUS", label: "Inflation Plus" },
] as const;

const CATEGORY_OPTIONS = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Entertainment",
  "Personal",
  "Education",
  "Other",
] as const;

const expenseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable().optional(),
  growthRule: z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]),
  growthRate: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  isDiscretionary: z.boolean(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  scenarioId: string;
  initialData?: {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    startDate: string;
    endDate: string | null;
    growthRule: string;
    growthRate: number | null;
    category: string | null;
    isDiscretionary: boolean;
  };
  mode: "create" | "edit";
}

export function ExpenseForm({ scenarioId, initialData, mode }: ExpenseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(
    initialData?.category && !CATEGORY_OPTIONS.includes(initialData.category as typeof CATEGORY_OPTIONS[number])
  );

  const [formData, setFormData] = useState<ExpenseFormData>({
    name: initialData?.name ?? "",
    amount: initialData?.amount ?? 0,
    frequency: (initialData?.frequency as ExpenseFormData["frequency"]) ?? "MONTHLY",
    startDate: initialData?.startDate ?? new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate ?? null,
    growthRule: (initialData?.growthRule as ExpenseFormData["growthRule"]) ?? "INFLATION",
    // Convert decimal to percentage for display
    growthRate: initialData?.growthRate !== null && initialData?.growthRate !== undefined
      ? initialData.growthRate * 100
      : null,
    category: initialData?.category ?? null,
    isDiscretionary: initialData?.isDiscretionary ?? false,
  });

  const updateField = <K extends keyof ExpenseFormData>(field: K, value: ExpenseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const parsed = expenseFormSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      setBusy(false);
      return;
    }

    const url = mode === "create" ? "/api/expenses" : `/api/expenses/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    // Convert percentage back to decimal for database storage
    const payload = {
      ...formData,
      growthRate: formData.growthRate !== null && formData.growthRate !== undefined
        ? formData.growthRate / 100
        : null,
      ...(mode === "create" && { scenarioId }),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to ${mode} expense`);
        if (data.details) {
          setFieldErrors(data.details);
        }
        setBusy(false);
        return;
      }

      router.push(`/expenses?scenarioId=${scenarioId}`);
      router.refresh();
    } catch (err) {
      setError("Network error occurred");
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 text-zinc-50";
  const labelClass = "text-xs text-zinc-400";
  const selectClass =
    "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 text-zinc-50";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={labelClass}>Name *</label>
        <input
          className={inputClass}
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g., Rent, Groceries, Car Insurance"
        />
        {fieldErrors.name && <p className="text-xs text-red-400 mt-1">{fieldErrors.name[0]}</p>}
      </div>

      {/* Amount and Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Amount ($) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={formData.amount || ""}
            onChange={(e) => updateField("amount", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
          {fieldErrors.amount && <p className="text-xs text-red-400 mt-1">{fieldErrors.amount[0]}</p>}
        </div>

        <div>
          <label className={labelClass}>Frequency *</label>
          <select
            className={selectClass}
            value={formData.frequency}
            onChange={(e) => updateField("frequency", e.target.value as ExpenseFormData["frequency"])}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Start Date and End Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Date *</label>
          <input
            type="date"
            className={inputClass}
            value={formData.startDate}
            onChange={(e) => updateField("startDate", e.target.value)}
          />
          {fieldErrors.startDate && <p className="text-xs text-red-400 mt-1">{fieldErrors.startDate[0]}</p>}
        </div>

        <div>
          <label className={labelClass}>End Date (optional)</label>
          <input
            type="date"
            className={inputClass}
            value={formData.endDate || ""}
            onChange={(e) => updateField("endDate", e.target.value || null)}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Category</label>
        {!showCustomCategory ? (
          <div className="flex gap-2">
            <select
              className={`${selectClass} flex-1`}
              value={formData.category || ""}
              onChange={(e) => updateField("category", e.target.value || null)}
            >
              <option value="">Select category...</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCustomCategory(true)}
              className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 text-sm"
            >
              Custom
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              value={formData.category || ""}
              onChange={(e) => updateField("category", e.target.value || null)}
              placeholder="Enter custom category"
            />
            <button
              type="button"
              onClick={() => {
                setShowCustomCategory(false);
                updateField("category", null);
              }}
              className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 text-sm"
            >
              Preset
            </button>
          </div>
        )}
      </div>

      {/* Growth Rule and Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Growth Rule</label>
          <select
            className={selectClass}
            value={formData.growthRule}
            onChange={(e) => updateField("growthRule", e.target.value as ExpenseFormData["growthRule"])}
          >
            {GROWTH_RULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Growth Rate (%)
            {formData.growthRule === "NONE" && <span className="text-zinc-600"> - N/A</span>}
          </label>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={formData.growthRate ?? ""}
            onChange={(e) => updateField("growthRate", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={formData.growthRule === "INFLATION" ? "Uses scenario inflation rate" : "0.0"}
            disabled={formData.growthRule === "NONE"}
          />
        </div>
      </div>

      {/* Is Discretionary */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isDiscretionary"
          checked={formData.isDiscretionary}
          onChange={(e) => updateField("isDiscretionary", e.target.checked)}
          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-zinc-50 focus:ring-zinc-600"
        />
        <label htmlFor="isDiscretionary" className="text-sm text-zinc-300">
          Discretionary expense (can be reduced or eliminated if needed)
        </label>
      </div>

      {/* Error message */}
      {error && <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</div>}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-zinc-50 text-zinc-950 py-2.5 font-medium disabled:opacity-60 hover:bg-zinc-200 transition-colors"
        >
          {busy ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Expense" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 rounded-xl border border-zinc-700 text-zinc-300 py-2.5 hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
