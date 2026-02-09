"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import Link from "next/link";

interface Insight {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
}

const SEVERITY_STYLES = {
  POSITIVE: {
    icon: "text-emerald-400",
    bg: "bg-emerald-950/30",
    border: "border-emerald-900/50",
  },
  INFO: {
    icon: "text-blue-400",
    bg: "bg-blue-950/30",
    border: "border-blue-900/50",
  },
  WARNING: {
    icon: "text-yellow-400",
    bg: "bg-yellow-950/30",
    border: "border-yellow-900/50",
  },
  ACTION_NEEDED: {
    icon: "text-red-400",
    bg: "bg-red-950/30",
    border: "border-red-900/50",
  },
};

function SeverityIcon({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.INFO;

  if (severity === "POSITIVE") {
    return (
      <svg className={`w-5 h-5 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (severity === "WARNING") {
    return (
      <svg className={`w-5 h-5 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }

  if (severity === "ACTION_NEEDED") {
    return (
      <svg className={`w-5 h-5 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }

  return (
    <svg className={`w-5 h-5 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

export function InsightsWidget() {
  const { selectedScenarioId } = useScenario();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!selectedScenarioId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/insights?scenarioId=${selectedScenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleDismiss = async (insightId: string) => {
    setDismissing(insightId);
    try {
      const res = await fetch(`/api/insights/${insightId}/dismiss`, { method: "POST" });
      if (res.ok) {
        setInsights((prev) => prev.filter((i) => i.id !== insightId));
      }
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
    } finally {
      setDismissing(null);
    }
  };

  if (!selectedScenarioId) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Financial Insights</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-5 h-5 bg-zinc-800 rounded-full shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-3 bg-zinc-800 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayedInsights = insights.slice(0, 5);
  const hasMore = insights.length > 5;

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <LightbulbIcon className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-medium">Financial Insights</h2>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-3">
            <LightbulbIcon className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400">No insights available yet.</p>
          <p className="text-xs text-zinc-500 mt-1">We'll analyze your financial data and provide personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LightbulbIcon className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-medium">Financial Insights</h2>
        </div>
        {hasMore && (
          <Link href="/insights" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            View All ({insights.length})
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {displayedInsights.map((insight) => {
          const style = SEVERITY_STYLES[insight.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.INFO;

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${style.border} ${style.bg} transition-all`}
            >
              <SeverityIcon severity={insight.severity} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-50 mb-1">{insight.title}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2">{insight.message}</p>
              </div>
              <button
                onClick={() => handleDismiss(insight.id)}
                disabled={dismissing === insight.id}
                className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 disabled:opacity-50"
                aria-label="Dismiss insight"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <Link
            href="/insights"
            className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <span>View all insights</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
