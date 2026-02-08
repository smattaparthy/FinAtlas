"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import BudgetComparisonChart from "@/components/charts/BudgetComparisonChart";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

interface BudgetRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  names: string[];
  notes: string | null;
  actualId: string | null;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1 + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const { selectedScenarioId } = useScenario();
  const toast = useToast();
  const [month, setMonth] = useState(getCurrentMonth);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [editedActuals, setEditedActuals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchBudget = useCallback(async () => {
    if (!selectedScenarioId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/budget?scenarioId=${selectedScenarioId}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch budget");
      const data = await res.json();
      setRows(data.rows);
      // Initialize edited actuals from fetched data
      const actuals: Record<string, string> = {};
      for (const row of data.rows) {
        actuals[row.category] = row.actual > 0 ? row.actual.toString() : "";
      }
      setEditedActuals(actuals);
      setDirty(false);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, month]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleSave = async () => {
    if (!selectedScenarioId) return;
    setSaving(true);
    try {
      const entries = Object.entries(editedActuals).map(([category, value]) => ({
        category,
        amount: parseFloat(value) || 0,
      }));
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenarioId, month, entries }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Budget actuals saved");
      setDirty(false);
      fetchBudget(); // Refresh data
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedScenarioId) return <PageSkeleton />;

  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalActual = rows.reduce((s, r) => s + (parseFloat(editedActuals[r.category] || "0") || 0), 0);
  const totalVariance = totalPlanned - totalActual;
  const overBudgetCount = rows.filter((r) => {
    const actual = parseFloat(editedActuals[r.category] || "0") || 0;
    return actual > r.planned && r.planned > 0;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budget vs Actual</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track actual spending against your planned expenses
          </p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-lg font-medium min-w-[200px] text-center">{formatMonth(month)}</div>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {loading && <PageSkeleton />}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Planned</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(totalPlanned)}</div>
              <div className="text-xs text-zinc-500 mt-1">monthly budget</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Actual</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(totalActual)}</div>
              <div className="text-xs text-zinc-500 mt-1">spent this month</div>
            </div>
            <div className={`rounded-2xl border p-4 ${totalVariance >= 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Variance</div>
              <div className={`text-xl font-semibold mt-1 ${totalVariance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalVariance >= 0 ? "+" : ""}{formatCurrency(totalVariance)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{totalVariance >= 0 ? "under budget" : "over budget"}</div>
            </div>
            <div className={`rounded-2xl border p-4 ${overBudgetCount === 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Over Budget</div>
              <div className={`text-xl font-semibold mt-1 ${overBudgetCount === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {overBudgetCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{overBudgetCount === 1 ? "category" : "categories"}</div>
            </div>
          </div>

          {/* Chart */}
          {rows.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
              <h2 className="text-lg font-medium mb-4">Budget Comparison</h2>
              <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-zinc-500 opacity-50" />
                  <span>Planned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>Under Budget</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span>Over Budget</span>
                </div>
              </div>
              <BudgetComparisonChart rows={rows} height={Math.max(200, rows.length * 60)} />
            </div>
          )}

          {/* Editable Table */}
          {rows.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-medium">Category Details</h2>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                      <th className="text-left p-4">Category</th>
                      <th className="text-right p-4">Planned</th>
                      <th className="text-right p-4">Actual</th>
                      <th className="text-right p-4">Variance</th>
                      <th className="text-center p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const actualValue = parseFloat(editedActuals[row.category] || "0") || 0;
                      const variance = row.planned - actualValue;
                      const overBudget = actualValue > row.planned && row.planned > 0;
                      return (
                        <tr key={row.category} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                          <td className="p-4">
                            <div className="text-sm font-medium text-zinc-200">{row.category}</div>
                            {row.names.length > 0 && (
                              <div className="text-xs text-zinc-500 mt-0.5">
                                {row.names.join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right text-sm text-zinc-300">
                            {formatCurrency(row.planned)}
                          </td>
                          <td className="p-4 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editedActuals[row.category] || ""}
                              onChange={(e) => {
                                setEditedActuals((prev) => ({
                                  ...prev,
                                  [row.category]: e.target.value,
                                }));
                                setDirty(true);
                              }}
                              placeholder="0.00"
                              className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-right text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                          </td>
                          <td className={`p-4 text-right text-sm font-medium ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                          </td>
                          <td className="p-4 text-center">
                            {actualValue === 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                                Pending
                              </span>
                            ) : overBudget ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                                Over
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                                Under
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {rows.length === 0 && !loading && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
              <div className="text-zinc-400 text-sm">
                No planned expenses found for this month. Add expenses to your scenario first.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
