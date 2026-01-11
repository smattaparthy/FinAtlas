"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Household = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type HouseholdContextType = {
  households: Household[];
  selectedHouseholdId: string | null;
  selectedHousehold: Household | null;
  setSelectedHouseholdId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextType | null>(null);

const HOUSEHOLD_STORAGE_KEY = "finatlas_selected_household";

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholds = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/households");
      if (!res.ok) {
        throw new Error("Failed to fetch households");
      }
      const data = await res.json();
      setHouseholds(data.households || []);

      // Try to restore from localStorage
      const storedId = localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
      const validHouseholds = data.households || [];

      if (storedId && validHouseholds.find((h: Household) => h.id === storedId)) {
        setSelectedHouseholdIdState(storedId);
      } else if (validHouseholds.length > 0) {
        // Auto-select first household if none stored
        const firstId = validHouseholds[0].id;
        setSelectedHouseholdIdState(firstId);
        localStorage.setItem(HOUSEHOLD_STORAGE_KEY, firstId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const setSelectedHouseholdId = (id: string | null) => {
    setSelectedHouseholdIdState(id);
    if (id) {
      localStorage.setItem(HOUSEHOLD_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
    }
  };

  const selectedHousehold = households.find((h) => h.id === selectedHouseholdId) || null;

  return (
    <HouseholdContext.Provider
      value={{
        households,
        selectedHouseholdId,
        selectedHousehold,
        setSelectedHouseholdId,
        isLoading,
        error,
        refetch: fetchHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return context;
}
