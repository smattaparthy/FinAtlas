"use client";

import { useState } from "react";

type LifeEventType = "BUY_HOUSE" | "HAVE_BABY" | "RETIRE_EARLY" | "CAREER_CHANGE" | "CUSTOM";

const EVENT_TYPES: { value: LifeEventType; label: string }[] = [
  { value: "BUY_HOUSE", label: "Buy a House" },
  { value: "HAVE_BABY", label: "Have a Baby" },
  { value: "RETIRE_EARLY", label: "Retire Early" },
  { value: "CAREER_CHANGE", label: "Career Change" },
  { value: "CUSTOM", label: "Custom" },
];

const COLOR_SWATCHES = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

interface LifeEventFormProps {
  initial?: {
    id: string;
    name: string;
    type: string;
    targetDate: string;
    description: string | null;
    color: string;
  };
  onSubmit: (data: {
    name: string;
    type: string;
    targetDate: string;
    description: string | null;
    color: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function LifeEventForm({ initial, onSubmit, onCancel }: LifeEventFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "CUSTOM");
  const [targetDate, setTargetDate] = useState(
    initial?.targetDate ? initial.targetDate.split("T")[0] : ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#10b981");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSubmit({
        name,
        type,
        targetDate: new Date(targetDate).toISOString(),
        description: description || null,
        color,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="text-lg font-semibold mb-4">
        {initial ? "Edit Life Event" : "Add Life Event"}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none"
            placeholder="e.g., Buy first home"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none resize-none"
            placeholder="Brief description..."
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Color</label>
          <div className="flex gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  color === c ? "ring-2 ring-offset-2 ring-offset-zinc-950 ring-zinc-50 scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !name || !targetDate}
            className="flex-1 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update" : "Add Event"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
