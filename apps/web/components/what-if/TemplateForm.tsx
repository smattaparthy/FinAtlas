"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";
import type { WhatIfTemplate } from "@/lib/templates/what-if";
import { formatCurrency } from "@/lib/format";

interface TemplateFormProps {
  template: WhatIfTemplate;
  onCancel: () => void;
}

export default function TemplateForm({ template, onCancel }: TemplateFormProps) {
  const { selectedScenarioId } = useScenario();
  const router = useRouter();
  const toast = useToast();

  const [inputs, setInputs] = useState<Record<string, number | string>>(() => {
    const defaults: Record<string, number | string> = {};
    for (const field of template.fields) {
      defaults[field.key] = field.defaultValue ?? 0;
    }
    return defaults;
  });

  const [scenarioName, setScenarioName] = useState(`What-If: ${template.name}`);
  const [applying, setApplying] = useState(false);

  function updateField(key: string, value: string, type: string) {
    if (type === "percentage") {
      setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    } else if (type === "number") {
      setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    } else {
      setInputs((prev) => ({ ...prev, [key]: value }));
    }
  }

  // Preview impact summary
  const modifications = template.generateModifications(inputs);
  const monthlyImpact = modifications.reduce((total, mod) => {
    if (mod.type === "ADD_EXPENSE") {
      const d = mod.data;
      const amount = d.amount as number;
      const freq = d.frequency as string;
      if (freq === "MONTHLY") return total + amount;
      if (freq === "ANNUAL") return total + amount / 12;
      return total;
    }
    if (mod.type === "ADD_LOAN") {
      return total + (mod.data.monthlyPayment as number || 0);
    }
    return total;
  }, 0);

  async function handleApply() {
    if (!selectedScenarioId) return;
    setApplying(true);

    try {
      const res = await fetch("/api/scenarios/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceScenarioId: selectedScenarioId,
          name: scenarioName,
          modifications,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create scenario");
      }

      toast.success(`Scenario "${scenarioName}" created`);
      router.push("/compare");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply template");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 max-w-lg w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{template.icon}</span>
        <div>
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <p className="text-sm text-zinc-500">{template.description}</p>
        </div>
      </div>

      {/* Scenario Name */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-1">Scenario Name</label>
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {template.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm text-zinc-400 mb-1">{field.label}</label>
            <div className="relative">
              {field.type === "number" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              )}
              <input
                type="number"
                value={inputs[field.key]}
                onChange={(e) => updateField(field.key, e.target.value, field.type)}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                placeholder={field.placeholder}
                className={`w-full py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-emerald-500 focus:outline-none ${
                  field.type === "number" ? "pl-7 pr-3" : "px-3"
                }`}
              />
              {field.type === "percentage" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
              )}
            </div>
            {field.help && (
              <p className="text-xs text-zinc-600 mt-0.5">{field.help}</p>
            )}
          </div>
        ))}
      </div>

      {/* Impact Preview */}
      {monthlyImpact > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Estimated Monthly Impact</div>
          <div className="text-lg font-semibold text-amber-400">
            +{formatCurrency(monthlyImpact)}/mo
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {modifications.length} change{modifications.length !== 1 ? "s" : ""} will be applied
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={handleApply}
          disabled={applying || !scenarioName}
          className="flex-1 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {applying ? "Creating..." : "Apply Template"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
