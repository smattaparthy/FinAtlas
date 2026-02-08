"use client";

import { useState } from "react";

type CloneScenarioModalProps = {
  sourceScenarioId: string;
  sourceName: string;
  open: boolean;
  onClose: () => void;
  onCloned: (newId: string) => void;
};

export function CloneScenarioModal({
  sourceScenarioId,
  sourceName,
  open,
  onClose,
  onCloned,
}: CloneScenarioModalProps) {
  const [name, setName] = useState(`Copy of ${sourceName}`);
  const [isCloning, setIsCloning] = useState(false);

  if (!open) return null;

  async function handleClone() {
    if (!name.trim()) return;

    setIsCloning(true);
    try {
      const res = await fetch("/api/scenarios/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceScenarioId, name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clone scenario");
      }

      const data = await res.json();
      onCloned(data.scenario.id);
      onClose();
    } catch (err) {
      console.error("Clone failed:", err);
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">
          Clone Scenario
        </h2>

        <label className="block text-sm text-zinc-400 mb-1.5">
          New scenario name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="
            w-full px-3 py-2 rounded-lg
            bg-zinc-800 border border-zinc-700 text-zinc-50 text-sm
            placeholder:text-zinc-500
            focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent
          "
          placeholder="Scenario name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isCloning) handleClone();
          }}
        />

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isCloning}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={isCloning || !name.trim()}
            className="
              px-4 py-2 text-sm font-medium rounded-lg
              bg-emerald-600 text-white
              hover:bg-emerald-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isCloning ? "Cloning..." : "Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
