"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";

interface Insight {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  dismissedAt: string | null;
}

const SEVERITY_STYLES = {
  POSITIVE: {
    icon: "text-emerald-400",
    bg: "bg-emerald-950/30",
    border: "border-emerald-900/50",
    badge: "bg-emerald-900/50 text-emerald-300",
  },
  INFO: {
    icon: "text-blue-400",
    bg: "bg-blue-950/30",
    border: "border-blue-900/50",
    badge: "bg-blue-900/50 text-blue-300",
  },
  WARNING: {
    icon: "text-yellow-400",
    bg: "bg-yellow-950/30",
    border: "border-yellow-900/50",
    badge: "bg-yellow-900/50 text-yellow-300",
  },
  ACTION_NEEDED: {
    icon: "text-red-400",
    bg: "bg-red-950/30",
    border: "border-red-900/50",
    badge: "bg-red-900/50 text-red-300",
  },
};

function SeverityIcon({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.INFO;

  if (severity === "POSITIVE") {
    return (
      <svg className={`w-6 h-6 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (severity === "WARNING") {
    return (
      <svg className={`w-6 h-6 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }

  if (severity === "ACTION_NEEDED") {
    return (
      <svg className={`w-6 h-6 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }

  return (
    <svg className={`w-6 h-6 ${style.icon} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

export default function InsightsPage() {
  const { selectedScenarioId } = useScenario();
  const toast = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

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
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    if (!selectedScenarioId) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/insights?scenarioId=${selectedScenarioId}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Generated ${data.count} new insights`);
        await fetchInsights();
      } else {
        toast.error("Failed to generate insights");
      }
    } catch (error) {
      console.error("Failed to generate insights:", error);
      toast.error("Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (insightId: string) => {
    setDismissing(insightId);
    try {
      const res = await fetch(`/api/insights/${insightId}/dismiss`, { method: "POST" });
      if (res.ok) {
        setInsights((prev) => prev.filter((i) => i.id !== insightId));
        toast.success("Insight dismissed");
      } else {
        toast.error("Failed to dismiss insight");
      }
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      toast.error("Failed to dismiss insight");
    } finally {
      setDismissing(null);
    }
  };

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-zinc-400">No scenario selected</p>
      </div>
    );
  }

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    if (!showDismissed && insight.dismissedAt) return false;
    if (filterType !== "ALL" && insight.type !== filterType) return false;
    if (filterSeverity !== "ALL" && insight.severity !== filterSeverity) return false;
    return true;
  });

  const uniqueTypes = Array.from(new Set(insights.map((i) => i.type)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Insights</h1>
          <p className="text-zinc-400 mt-1">AI-powered recommendations based on your financial data</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.36v4.992" />
              </svg>
              Refresh Insights
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Severity:</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Severities</option>
            <option value="ACTION_NEEDED">Action Needed</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="POSITIVE">Positive</option>
          </select>
        </div>

        <label className="flex items-center gap-2 ml-auto">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-sm text-zinc-400">Show dismissed</span>
        </label>
      </div>

      {/* Insights List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-zinc-800 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-zinc-800 rounded w-1/3"></div>
                  <div className="h-4 bg-zinc-800 rounded w-full"></div>
                  <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-50 mb-2">No insights to display</h3>
          <p className="text-sm text-zinc-400 mb-6">
            {insights.length === 0
              ? "Click 'Refresh Insights' to generate personalized recommendations."
              : "Try adjusting your filters or generate new insights."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.INFO;

            return (
              <div
                key={insight.id}
                className={`rounded-2xl border p-6 transition-all ${style.border} ${style.bg} ${
                  insight.dismissedAt ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <SeverityIcon severity={insight.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-medium text-zinc-50">{insight.title}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${style.badge}`}>
                        {insight.severity.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-3">{insight.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {new Date(insight.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {!insight.dismissedAt && (
                        <button
                          onClick={() => handleDismiss(insight.id)}
                          disabled={dismissing === insight.id}
                          className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50"
                        >
                          {dismissing === insight.id ? "Dismissing..." : "Dismiss"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
