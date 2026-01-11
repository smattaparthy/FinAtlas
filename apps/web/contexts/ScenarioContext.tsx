"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useHousehold } from "./HouseholdContext";

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

const SCENARIO_STORAGE_KEY = "finatlas_selected_scenario";

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { selectedHouseholdId } = useHousehold();
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioIdState] = useState<string | null>(null);
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
      setAllScenarios(data.scenarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  // Filter scenarios by selected household
  const scenarios = selectedHouseholdId
    ? allScenarios.filter((s) => s.householdId === selectedHouseholdId)
    : [];

  // Auto-select scenario when household changes
  useEffect(() => {
    if (scenarios.length === 0) {
      setSelectedScenarioIdState(null);
      return;
    }

    // Try to restore from localStorage for this household
    const storedId = localStorage.getItem(`${SCENARIO_STORAGE_KEY}_${selectedHouseholdId}`);
    if (storedId && scenarios.find((s) => s.id === storedId)) {
      setSelectedScenarioIdState(storedId);
    } else {
      // Auto-select baseline scenario or first scenario
      const baseline = scenarios.find((s) => s.isBaseline);
      const newId = baseline?.id || scenarios[0].id;
      setSelectedScenarioIdState(newId);
      if (selectedHouseholdId) {
        localStorage.setItem(`${SCENARIO_STORAGE_KEY}_${selectedHouseholdId}`, newId);
      }
    }
  }, [selectedHouseholdId, scenarios.length, scenarios]);

  const setSelectedScenarioId = (id: string | null) => {
    setSelectedScenarioIdState(id);
    if (id && selectedHouseholdId) {
      localStorage.setItem(`${SCENARIO_STORAGE_KEY}_${selectedHouseholdId}`, id);
    }
  };

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
