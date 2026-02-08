"use client";

import type { Scenario } from "@/contexts/ScenarioContext";

const SCENARIO_COLORS = ["rgb(52, 211, 153)", "rgb(96, 165, 250)", "rgb(251, 191, 36)"];

interface ScenarioComparisonPickerProps {
  scenarios: Scenario[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function ScenarioComparisonPicker({
  scenarios,
  selectedIds,
  onToggle,
}: ScenarioComparisonPickerProps) {
  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-400 mb-3">Select scenarios to compare (max 3)</h2>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => {
          const selIndex = selectedIds.indexOf(scenario.id);
          const isSelected = selIndex !== -1;
          const color = isSelected ? SCENARIO_COLORS[selIndex] : undefined;
          const isDisabled = !isSelected && selectedIds.length >= 3;

          return (
            <button
              key={scenario.id}
              onClick={() => !isDisabled && onToggle(scenario.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150
                ${
                  isSelected
                    ? "border-zinc-600 bg-zinc-800 text-zinc-50"
                    : isDisabled
                    ? "border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }
              `}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color ?? "#3f3f46" }}
              />
              {scenario.name}
              {scenario.isBaseline && (
                <span className="text-xs text-zinc-500">(baseline)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SCENARIO_COLORS };
