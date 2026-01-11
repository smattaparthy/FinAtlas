"use client";

import { useHousehold } from "@/contexts/HouseholdContext";
import { useState, useRef, useEffect } from "react";

export function HouseholdSelector() {
  const { households, selectedHousehold, setSelectedHouseholdId, isLoading, error } = useHousehold();
  const [isOpen, setIsOpen] = useState(false);
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
        Loading...
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

  if (households.length === 0) {
    return (
      <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-500">
        No households
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
        <HouseholdIcon className="w-4 h-4 text-zinc-400" />
        <span className="flex-1 text-left truncate">
          {selectedHousehold?.name || "Select household"}
        </span>
        <ChevronIcon className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="
          absolute top-full left-0 right-0 mt-1 z-50
          bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl
          py-1 max-h-60 overflow-y-auto
        ">
          {households.map((household) => (
            <button
              key={household.id}
              onClick={() => {
                setSelectedHouseholdId(household.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                transition-colors duration-150
                ${household.id === selectedHousehold?.id
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                }
              `}
            >
              <span className="flex-1 truncate">{household.name}</span>
            </button>
          ))}
        </div>
      )}
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

function HouseholdIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
