"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { NotificationPanel, type Alert } from "./NotificationPanel";

const DISMISSED_KEY = "finatlas_dismissed_alerts";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

export function NotificationBell() {
  const { selectedScenarioId } = useScenario();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds());
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = alerts.filter((a) => !dismissedIds.has(a.id)).length;

  const fetchAlerts = useCallback(async () => {
    if (!selectedScenarioId) return;
    try {
      const res = await fetch(`/api/notifications?scenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, [selectedScenarioId]);

  // Fetch on mount and when scenarioId changes
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Poll every 5 minutes
  useEffect(() => {
    if (!selectedScenarioId) return;
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedScenarioId, fetchAlerts]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors"
        aria-label={`Notifications${visibleCount > 0 ? `, ${visibleCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {visibleCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {visibleCount > 99 ? "99+" : visibleCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          alerts={alerts}
          onDismissedChange={(ids) => setDismissedIds(ids)}
        />
      )}
    </div>
  );
}
