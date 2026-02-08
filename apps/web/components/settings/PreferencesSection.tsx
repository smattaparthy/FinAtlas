"use client";

import { usePreferences, Currency, DateFormat, Theme } from "@/contexts/PreferencesContext";

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
];

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2025)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2025)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2025-12-31)" },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function PreferencesSection() {
  const { preferences, updatePreferences } = usePreferences();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-lg font-medium">Preferences</h2>
        <p className="text-sm text-zinc-400 mt-1">Customize your experience</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Currency Setting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Currency</p>
            <p className="text-xs text-zinc-500 mt-0.5">Choose your preferred currency format</p>
          </div>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors w-48"
            value={preferences.currency}
            onChange={(e) => updatePreferences({ currency: e.target.value as Currency })}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format Setting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Date Format</p>
            <p className="text-xs text-zinc-500 mt-0.5">Choose how dates are displayed</p>
          </div>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors w-48"
            value={preferences.dateFormat}
            onChange={(e) => updatePreferences({ dateFormat: e.target.value as DateFormat })}
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Setting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Theme</p>
            <p className="text-xs text-zinc-500 mt-0.5">Customize the app appearance</p>
          </div>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors w-48"
            value={preferences.theme}
            onChange={(e) => updatePreferences({ theme: e.target.value as Theme })}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Setting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Notifications</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manage notification preferences</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 -mt-3 text-right">Coming soon</p>
      </div>
    </div>
  );
}
