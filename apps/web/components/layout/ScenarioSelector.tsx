"use client";

import { useScenario } from "@/contexts/ScenarioContext";
import { useState, useRef, useEffect } from "react";
import { ScenarioManagerModal } from "@/components/scenarios/ScenarioManagerModal";

export function ScenarioSelector() {
  const { scenarios, selectedScenario, setSelectedScenarioId, isLoading, error } = useScenario();
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-500">
        <LoadingSpinner />
        Loading scenarios...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 rounded-xl bg-red-900/20 border border-red-800 text-sm text-red-400">
        Error: {error}
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-500">
        No scenarios found
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-zinc-900 border border-zinc-800 text-sm text-zinc-50
          hover:bg-zinc-800 transition-colors duration-150
          min-w-[200px]
        "
      >
        <ScenarioIcon className="w-4 h-4 text-zinc-400" />
        <span className="flex-1 text-left truncate">
          {selectedScenario?.name || "Select scenario"}
        </span>
        {selectedScenario?.isBaseline && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
            Baseline
          </span>
        )}
        <ChevronIcon className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="
          absolute top-full left-0 right-0 mt-1 z-50
          bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl
          py-1 max-h-60 overflow-y-auto
        ">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenarioId(scenario.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                transition-colors duration-150
                ${scenario.id === selectedScenario?.id
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                }
              `}
            >
              <span className="flex-1 truncate">{scenario.name}</span>
              {scenario.isBaseline && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                  Baseline
                </span>
              )}
            </button>
          ))}
          <div className="border-t border-zinc-800 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowManager(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
            >
              <ManageIcon className="w-4 h-4" />
              Manage Scenarios
            </button>
          </div>
        </div>
      )}

      <ScenarioManagerModal
        open={showManager}
        onClose={() => setShowManager(false)}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ScenarioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ManageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
