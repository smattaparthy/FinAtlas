"use client";

import { useEffect, useState } from "react";

export interface Alert {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  actionHref?: string;
  priority: number;
}

const DISMISSED_KEY = "finatlas_dismissed_alerts";

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

const borderColorMap: Record<Alert["type"], string> = {
  warning: "border-l-4 border-amber-500",
  info: "border-l-4 border-blue-500",
  success: "border-l-4 border-emerald-500",
};

const iconMap: Record<Alert["type"], React.ReactNode> = {
  warning: (
    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

interface NotificationPanelProps {
  alerts: Alert[];
  onDismissedChange: (dismissedIds: Set<string>) => void;
}

export function NotificationPanel({ alerts, onDismissedChange }: NotificationPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds());

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  function dismiss(alertId: string) {
    const next = new Set(dismissedIds);
    next.add(alertId);
    setDismissedIds(next);
    saveDismissedIds(next);
    onDismissedChange(next);
  }

  function clearAll() {
    const next = new Set(dismissedIds);
    for (const alert of visibleAlerts) {
      next.add(alert.id);
    }
    setDismissedIds(next);
    saveDismissedIds(next);
    onDismissedChange(next);
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-50">Notifications</h3>
        {visibleAlerts.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Alert list */}
      {visibleAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <svg className="w-10 h-10 text-emerald-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-zinc-400">All caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`px-4 py-3 ${borderColorMap[alert.type]} hover:bg-zinc-800/40 transition-colors`}
            >
              <div className="flex items-start gap-2">
                {iconMap[alert.type]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-50 leading-snug">
                    {alert.title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {alert.description}
                  </p>
                  {alert.actionHref && (
                    <a
                      href={alert.actionHref}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-1.5 transition-colors"
                    >
                      View
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => dismiss(alert.id)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
                  aria-label={`Dismiss ${alert.title}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
