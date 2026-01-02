"use client";

import { useState } from "react";
import { z } from "zod";

const GoalType = z.enum([
  "RETIREMENT",
  "EDUCATION",
  "MAJOR_PURCHASE",
  "EMERGENCY_FUND",
  "CUSTOM",
]);

type GoalTypeValue = z.infer<typeof GoalType>;

const goalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  type: GoalType,
  targetAmount: z.number().positive("Target amount must be positive"),
  targetDate: z.string().optional(),
  priority: z.number().int().min(1).max(3),
});

export type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  initialData?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const GOAL_TYPES: { value: GoalTypeValue; label: string; color: string }[] = [
  { value: "RETIREMENT", label: "Retirement", color: "text-purple-400" },
  { value: "EDUCATION", label: "Education", color: "text-blue-400" },
  { value: "MAJOR_PURCHASE", label: "Major Purchase", color: "text-green-400" },
  { value: "EMERGENCY_FUND", label: "Emergency Fund", color: "text-orange-400" },
  { value: "CUSTOM", label: "Custom", color: "text-zinc-400" },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: "High", color: "text-red-400" },
  { value: 2, label: "Medium", color: "text-yellow-400" },
  { value: 3, label: "Low", color: "text-green-400" },
];

export function GoalForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Save Goal",
}: GoalFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<GoalTypeValue>(
    initialData?.type ?? "CUSTOM"
  );
  const [targetAmount, setTargetAmount] = useState(
    initialData?.targetAmount?.toString() ?? ""
  );
  const [targetDate, setTargetDate] = useState(
    initialData?.targetDate ?? ""
  );
  const [priority, setPriority] = useState(initialData?.priority ?? 2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const formData = {
      name: name.trim(),
      type,
      targetAmount: parseFloat(targetAmount) || 0,
      targetDate: targetDate || undefined,
      priority,
    };

    const result = goalSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
  }

  const inputClassName =
    "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 transition-colors";
  const labelClassName = "text-xs text-zinc-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={labelClassName}>Goal Name</label>
        <input
          className={inputClassName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Retirement at 65"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className={labelClassName}>Goal Type</label>
        <select
          className={inputClassName}
          value={type}
          onChange={(e) => setType(e.target.value as GoalTypeValue)}
          disabled={isLoading}
        >
          {GOAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-xs text-red-400">{errors.type}</p>
        )}
      </div>

      {/* Target Amount */}
      <div>
        <label className={labelClassName}>Target Amount ($)</label>
        <input
          type="number"
          className={inputClassName}
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="100000"
          min="0"
          step="0.01"
          disabled={isLoading}
        />
        {errors.targetAmount && (
          <p className="mt-1 text-xs text-red-400">{errors.targetAmount}</p>
        )}
      </div>

      {/* Target Date */}
      <div>
        <label className={labelClassName}>Target Date (optional)</label>
        <input
          type="date"
          className={inputClassName}
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={isLoading}
        />
        {errors.targetDate && (
          <p className="mt-1 text-xs text-red-400">{errors.targetDate}</p>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className={labelClassName}>Priority</label>
        <div className="mt-2 flex gap-3">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                priority === p.value
                  ? "border-zinc-600 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
              onClick={() => setPriority(p.value)}
              disabled={isLoading}
            >
              <span className={p.color}>{p.label}</span>
            </button>
          ))}
        </div>
        {errors.priority && (
          <p className="mt-1 text-xs text-red-400">{errors.priority}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-zinc-50 text-zinc-950 py-2.5 font-medium disabled:opacity-60 hover:bg-zinc-200 transition-colors"
      >
        {isLoading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

export { GOAL_TYPES, PRIORITY_OPTIONS };
