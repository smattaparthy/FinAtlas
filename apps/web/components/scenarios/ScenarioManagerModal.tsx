"use client";

import { useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { CloneScenarioModal } from "./CloneScenarioModal";

type ScenarioManagerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ScenarioManagerModal({
  open,
  onClose,
}: ScenarioManagerModalProps) {
  const {
    scenarios,
    selectedScenarioId,
    setSelectedScenarioId,
    refetch,
  } = useScenario();

  const [cloneTarget, setCloneTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!open) return null;

  async function handleDelete(id: string, name: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete scenario");
      }

      // If the deleted scenario was selected, switch to the first remaining
      if (id === selectedScenarioId) {
        const remaining = scenarios.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          setSelectedScenarioId(remaining[0].id);
        }
      }

      await refetch();
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCloned(newId: string) {
    await refetch();
    setSelectedScenarioId(newId);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-50">
              Manage Scenarios
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-50 transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-0">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-zinc-50 truncate">
                    {scenario.name}
                  </span>
                  {scenario.isBaseline && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 shrink-0">
                      Baseline
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {confirmDeleteId === scenario.id && !scenario.isBaseline ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button
                        onClick={() =>
                          handleDelete(scenario.id, scenario.name)
                        }
                        disabled={deletingId === scenario.id}
                        className="
                          px-2.5 py-1 text-xs font-medium rounded-lg
                          border border-red-600 text-red-400
                          hover:bg-red-600 hover:text-white transition-colors
                          disabled:opacity-50
                        "
                      >
                        {deletingId === scenario.id ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-50 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setCloneTarget({
                            id: scenario.id,
                            name: scenario.name,
                          })
                        }
                        className="
                          px-2.5 py-1 text-xs font-medium rounded-lg
                          border border-emerald-600 text-emerald-400
                          hover:bg-emerald-600 hover:text-white transition-colors
                        "
                      >
                        Clone
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(scenario.id, scenario.name)
                        }
                        disabled={scenario.isBaseline}
                        className="
                          px-2.5 py-1 text-xs font-medium rounded-lg
                          border border-red-600 text-red-400
                          hover:bg-red-600 hover:text-white transition-colors
                          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-400
                        "
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {scenarios.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-6">
              No scenarios found.
            </p>
          )}
        </div>
      </div>

      {cloneTarget && (
        <CloneScenarioModal
          sourceScenarioId={cloneTarget.id}
          sourceName={cloneTarget.name}
          open={true}
          onClose={() => setCloneTarget(null)}
          onCloned={handleCloned}
        />
      )}
    </>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
