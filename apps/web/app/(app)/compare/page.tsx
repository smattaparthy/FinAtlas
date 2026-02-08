"use client";

import { useCallback, useEffect, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import type { ProjectionResultDTO } from "@finatlas/engine/src/types";
import ScenarioComparisonPicker from "@/components/compare/ScenarioComparisonPicker";
import ComparisonChart from "@/components/compare/ComparisonChart";
import DeltaSummary from "@/components/compare/DeltaSummary";
import ComparisonTable from "@/components/compare/ComparisonTable";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

interface ProjectionResult {
  name: string;
  result: ProjectionResultDTO;
}

export default function ComparePage() {
  const { scenarios, isLoading: scenarioLoading } = useScenario();
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [projections, setProjections] = useState<Map<string, ProjectionResult>>(new Map());
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((s) => s !== id);
        }
        if (prev.length >= 3) return prev;
        return [...prev, id];
      });
    },
    []
  );

  // Fetch projections for selected scenarios
  useEffect(() => {
    if (selectedIds.length === 0) {
      setProjections(new Map());
      return;
    }

    const idsToFetch = selectedIds.filter((id) => !projections.has(id));
    if (idsToFetch.length === 0) return;

    setLoading(true);

    Promise.all(
      idsToFetch.map(async (id) => {
        const res = await fetch(`/api/projections?scenarioId=${id}`);
        if (!res.ok) throw new Error(`Failed to fetch projection for scenario`);
        const result: ProjectionResultDTO = await res.json();
        const scenario = scenarios.find((s) => s.id === id);
        return { id, name: scenario?.name ?? "Unknown", result };
      })
    )
      .then((results) => {
        setProjections((prev) => {
          const next = new Map(prev);
          // Remove any ids no longer selected
          for (const key of next.keys()) {
            if (!selectedIds.includes(key)) next.delete(key);
          }
          for (const r of results) {
            next.set(r.id, { name: r.name, result: r.result });
          }
          return next;
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load projections");
      })
      .finally(() => setLoading(false));
  }, [selectedIds, scenarios]);

  // Clean up projections for deselected scenarios
  useEffect(() => {
    setProjections((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const key of next.keys()) {
        if (!selectedIds.includes(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedIds]);

  if (scenarioLoading) {
    return <PageSkeleton />;
  }

  // Build chart and summary data from selected projections
  const selectedProjections = selectedIds
    .map((id) => projections.get(id))
    .filter((p): p is ProjectionResult => !!p);

  const chartScenarios = selectedProjections.map((p) => ({
    name: p.name,
    series: p.result.series?.netWorth ?? [],
  }));

  const summaryScenarios = selectedProjections.map((p) => ({
    name: p.name,
    annual: p.result.annual ?? [],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Compare Scenarios</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Compare net worth projections across different scenarios side by side
        </p>
      </div>

      {/* Scenario picker */}
      <ScenarioComparisonPicker
        scenarios={scenarios}
        selectedIds={selectedIds}
        onToggle={handleToggle}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-zinc-400 text-sm">Loading projections...</div>
        </div>
      )}

      {/* Chart */}
      {selectedProjections.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-lg shadow-black/20">
          <h2 className="text-lg font-medium mb-4">Net Worth Comparison</h2>
          <ComparisonChart scenarios={chartScenarios} />
        </div>
      )}

      {/* Delta summary */}
      {selectedProjections.length >= 2 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Key Differences</h2>
          <DeltaSummary scenarios={summaryScenarios} />
        </div>
      )}

      {/* Year-by-year table */}
      {selectedProjections.length >= 2 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Year-by-Year Comparison</h2>
          <ComparisonTable scenarios={summaryScenarios} />
        </div>
      )}

      {/* Empty state */}
      {selectedIds.length === 0 && !loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/60 text-zinc-400 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-200 mb-1">No scenarios selected</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Select 2 or 3 scenarios above to compare their projected outcomes side by side.
          </p>
        </div>
      )}
    </div>
  );
}
