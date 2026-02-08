"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import NetWorthChart from "@/components/charts/NetWorthChart";
import ShareDialog from "@/components/reports/ShareDialog";
import { formatCurrency } from "@/lib/format";

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
}

interface HealthScore {
  overall: number;
  components: Array<{ name: string; score: number; description: string }>;
  insights: Array<{ type: string; title: string; description: string }>;
}

interface ProjectionPoint {
  t: string;
  v: number;
}

interface Milestone {
  date: string;
  name: string;
  color: string;
}

export default function ReportsPage() {
  const { selectedScenarioId } = useScenario();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [projection, setProjection] = useState<ProjectionPoint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchAll() {
      setLoading(true);
      try {
        const [dashRes, healthRes, projRes, eventsRes] = await Promise.all([
          fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`),
          fetch(`/api/health-score?scenarioId=${selectedScenarioId}`),
          fetch(`/api/projections?scenarioId=${selectedScenarioId}`),
          fetch(`/api/life-events?scenarioId=${selectedScenarioId}`),
        ]);

        if (dashRes.ok) setDashboard(await dashRes.json());
        if (healthRes.ok) setHealthScore(await healthRes.json());

        if (projRes.ok) {
          const projData = await projRes.json();
          setProjection(projData.series?.netWorth || []);
        } else {
          // Fallback: build simple projection from dashboard data
          if (dashRes.ok) {
            const d = await dashRes.json().catch(() => null);
            if (d) {
              const pts: ProjectionPoint[] = [];
              let nw = d.netWorth;
              const now = new Date();
              for (let i = 0; i <= 10; i++) {
                const date = new Date(now);
                date.setFullYear(now.getFullYear() + i);
                pts.push({ t: date.toISOString(), v: Math.round(nw) });
                nw = nw * 1.07 + (d.netSavings ?? 0) * 0.75;
              }
              setProjection(pts);
            }
          }
        }

        if (eventsRes.ok) {
          const evData = await eventsRes.json();
          setMilestones(
            evData.lifeEvents.map((e: { targetDate: string; name: string; color: string }) => ({
              date: e.targetDate,
              name: e.name,
              color: e.color,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [selectedScenarioId]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error}</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const scoreColor =
    (healthScore?.overall ?? 0) >= 81
      ? "text-emerald-400"
      : (healthScore?.overall ?? 0) >= 61
      ? "text-blue-400"
      : (healthScore?.overall ?? 0) >= 41
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold">Financial Report</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Comprehensive overview of your financial position
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShare(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Share
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      {selectedScenarioId && (
        <ShareDialog
          scenarioId={selectedScenarioId}
          open={showShare}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Print Header */}
      <div className="hidden print-only">
        <h1 className="text-2xl font-bold">FinAtlas Financial Report</h1>
        <p className="text-sm text-zinc-500">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Health Score Summary */}
      {healthScore && (
        <div className="print-section rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Financial Health Score</h2>
          <div className="flex items-center gap-6">
            <div className={`text-5xl font-bold ${scoreColor}`}>
              {healthScore.overall}
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
              {healthScore.components.map((c) => (
                <div key={c.name} className="text-center">
                  <div className="text-lg font-semibold">{c.score}</div>
                  <div className="text-xs text-zinc-500">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {dashboard && (
        <div className="print-section grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Net Worth" value={formatCurrency(dashboard.netWorth)} />
          <MetricCard label="Total Assets" value={formatCurrency(dashboard.totalAssets)} />
          <MetricCard label="Total Debt" value={formatCurrency(dashboard.totalDebt)} />
          <MetricCard label="Annual Income" value={formatCurrency(dashboard.totalIncome)} />
          <MetricCard label="Annual Expenses" value={formatCurrency(dashboard.totalExpenses)} />
          <MetricCard label="Net Savings" value={formatCurrency(dashboard.netSavings)} />
        </div>
      )}

      {/* Projection Chart */}
      {projection.length > 1 && (
        <div className="print-section rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Net Worth Projection</h2>
          <NetWorthChart series={projection} height={250} milestones={milestones} />
        </div>
      )}

      {/* Insights */}
      {healthScore && healthScore.insights.length > 0 && (
        <div className="print-section rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Key Insights</h2>
          <div className="space-y-2">
            {healthScore.insights.map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border ${
                  insight.type === "positive"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : insight.type === "warning"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-blue-500/20 bg-blue-500/5"
                }`}
              >
                <div className="font-medium text-sm">{insight.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{insight.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600 pb-8 print-section">
        Generated by FinAtlas on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
