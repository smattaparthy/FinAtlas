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
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid rgb(var(--border-primary))`, backgroundColor: `rgba(var(--bg-card), 0.5)` }}>
      <div className="p-6" style={{ borderBottom: `1px solid rgb(var(--border-primary))` }}>
        <h2 className="text-lg font-medium" style={{ color: `rgb(var(--text-primary))` }}>Preferences</h2>
        <p className="text-sm mt-1" style={{ color: `rgb(var(--text-secondary))` }}>Customize your experience</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Currency Setting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: `rgb(var(--text-primary))` }}>Currency</p>
            <p className="text-xs mt-0.5" style={{ color: `rgb(var(--text-muted))` }}>Choose your preferred currency format</p>
          </div>
          <select
            className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors w-48"
            style={{
              backgroundColor: `rgb(var(--input-bg))`,
              border: `1px solid rgb(var(--input-border))`,
              color: `rgb(var(--text-primary))`
            }}
            value={preferences.currency}
            onChange={(e) => updatePreferences({ currency: e.target.value as Currency })}
            onFocus={(e) => e.currentTarget.style.borderColor = `rgb(var(--accent-emerald))`}
            onBlur={(e) => e.currentTarget.style.borderColor = `rgb(var(--input-border))`}
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
            <p className="text-sm font-medium" style={{ color: `rgb(var(--text-primary))` }}>Date Format</p>
            <p className="text-xs mt-0.5" style={{ color: `rgb(var(--text-muted))` }}>Choose how dates are displayed</p>
          </div>
          <select
            className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors w-48"
            style={{
              backgroundColor: `rgb(var(--input-bg))`,
              border: `1px solid rgb(var(--input-border))`,
              color: `rgb(var(--text-primary))`
            }}
            value={preferences.dateFormat}
            onChange={(e) => updatePreferences({ dateFormat: e.target.value as DateFormat })}
            onFocus={(e) => e.currentTarget.style.borderColor = `rgb(var(--accent-emerald))`}
            onBlur={(e) => e.currentTarget.style.borderColor = `rgb(var(--input-border))`}
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
            <p className="text-sm font-medium" style={{ color: `rgb(var(--text-primary))` }}>Theme</p>
            <p className="text-xs mt-0.5" style={{ color: `rgb(var(--text-muted))` }}>Customize the app appearance</p>
          </div>
          <select
            className="rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors w-48"
            style={{
              backgroundColor: `rgb(var(--input-bg))`,
              border: `1px solid rgb(var(--input-border))`,
              color: `rgb(var(--text-primary))`
            }}
            value={preferences.theme}
            onChange={(e) => updatePreferences({ theme: e.target.value as Theme })}
            onFocus={(e) => e.currentTarget.style.borderColor = `rgb(var(--accent-emerald))`}
            onBlur={(e) => e.currentTarget.style.borderColor = `rgb(var(--input-border))`}
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
            <p className="text-sm font-medium" style={{ color: `rgb(var(--text-primary))` }}>Notifications</p>
            <p className="text-xs mt-0.5" style={{ color: `rgb(var(--text-muted))` }}>Manage notification preferences</p>
          </div>
        </div>
        <p className="text-xs -mt-3 text-right" style={{ color: `rgb(var(--text-muted))` }}>Coming soon</p>
      </div>
    </div>
  );
}
