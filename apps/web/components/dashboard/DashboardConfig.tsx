"use client";

import { useState, useEffect, useCallback } from "react";
import type { WidgetConfig } from "@/lib/dashboard/widgetConfig";
import { resetConfig } from "@/lib/dashboard/widgetConfig";

interface DashboardConfigProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: WidgetConfig[]) => void;
  currentConfig: WidgetConfig[];
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function DashboardConfig({
  open,
  onClose,
  onSave,
  currentConfig,
}: DashboardConfigProps) {
  const [localConfig, setLocalConfig] = useState<WidgetConfig[]>([]);

  useEffect(() => {
    if (open) {
      setLocalConfig(
        [...currentConfig].sort((a, b) => a.order - b.order)
      );
    }
  }, [open, currentConfig]);

  const handleToggle = useCallback((id: string) => {
    setLocalConfig((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setLocalConfig((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = { ...next[index], order: next[index - 1].order };
      next[index] = { ...temp, order: next[index].order };
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setLocalConfig((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = { ...next[index], order: next[index + 1].order };
      next[index] = { ...temp, order: next[index].order };
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    const defaults = resetConfig();
    setLocalConfig(defaults.sort((a, b) => a.order - b.order));
  }, []);

  const handleSave = useCallback(() => {
    // Normalize order values based on current position
    const normalized = localConfig.map((w, i) => ({ ...w, order: i }));
    onSave(normalized);
    onClose();
  }, [localConfig, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Customize Dashboard"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-50">Customize Dashboard</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Widget list */}
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {localConfig.map((widget, index) => (
            <div
              key={widget.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
            >
              {/* Checkbox */}
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => handleToggle(widget.id)}
                  className="sr-only peer"
                  aria-label={`Toggle ${widget.name}`}
                />
                <div className="w-5 h-5 rounded border border-zinc-600 bg-zinc-800 peer-checked:bg-emerald-600 peer-checked:border-emerald-600 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-900">
                  {widget.enabled && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </label>

              {/* Widget info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-50">{widget.name}</p>
                <p className="text-xs text-zinc-400 truncate">{widget.description}</p>
              </div>

              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded p-0.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:bg-transparent"
                  aria-label={`Move ${widget.name} up`}
                >
                  <ChevronUpIcon />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === localConfig.length - 1}
                  className="rounded p-0.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-zinc-400 disabled:hover:bg-transparent"
                  aria-label={`Move ${widget.name} down`}
                >
                  <ChevronDownIcon />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
          <button
            onClick={handleReset}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
