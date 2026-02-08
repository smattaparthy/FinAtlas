"use client";

import { useState, useEffect, useRef } from "react";

const COMMON_CATEGORIES = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Entertainment",
  "Personal",
  "Education",
  "Shopping",
  "Subscriptions",
  "Travel",
  "Childcare",
  "Pets",
  "Charity",
  "Other",
];

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCategoryChange?: (category: string) => void;
  onClearSelection: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onDelete,
  onCategoryChange,
  onClearSelection,
}: BulkActionBarProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [visible, setVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCategoryDropdown]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-3 shadow-xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <span className="text-sm font-medium text-zinc-300">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-zinc-700" />

      {onCategoryChange && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Change Category
          </button>
          {showCategoryDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-48 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
              {COMMON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onCategoryChange(cat);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onDelete}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        Delete Selected
      </button>

      <button
        onClick={onClearSelection}
        className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
