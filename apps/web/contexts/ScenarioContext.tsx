"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Scenario = {
  id: string;
  name: string;
  description: string | null;
  isBaseline: boolean;
  householdId: string;
};

type ScenarioContextType = {
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  selectedScenario: Scenario | null;
  setSelectedScenarioId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const ScenarioContext = createContext<ScenarioContextType | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scenarios");
      if (!res.ok) {
        throw new Error("Failed to fetch scenarios");
      }
      const data = await res.json();
      setScenarios(data.scenarios || []);

      // Auto-select baseline scenario or first scenario
      if (data.scenarios?.length > 0 && !selectedScenarioId) {
        const baseline = data.scenarios.find((s: Scenario) => s.isBaseline);
        setSelectedScenarioId(baseline?.id || data.scenarios[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || null;

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
        selectedScenarioId,
        selectedScenario,
        setSelectedScenarioId,
        isLoading,
        error,
        refetch: fetchScenarios,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error("useScenario must be used within a ScenarioProvider");
  }
  return context;
}
