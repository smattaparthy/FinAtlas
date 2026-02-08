"use client";

import { useEffect, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import NetWorthHistoryChart from "@/components/charts/NetWorthHistoryChart";
import { formatCurrency, formatAxisDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

interface Snapshot {
  id: string;
  scenarioId: string;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  notes: string | null;
  isAutomatic: boolean;
  createdAt: string;
}

interface ProjectedPoint {
  t: string;
  v: number;
}

export default function NetWorthHistoryPage() {
  const { selectedScenarioId } = useScenario();
  const toast = useToast();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [projected, setProjected] = useState<ProjectedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  const fetchData = async () => {
    if (!selectedScenarioId) return;
    setLoading(true);

    try {
      const [snapshotsRes, projectionsRes] = await Promise.all([
        fetch(`/api/net-worth-snapshots?scenarioId=${selectedScenarioId}`),
        fetch(`/api/projections?scenarioId=${selectedScenarioId}`),
      ]);

      if (snapshotsRes.ok) {
        const data = await snapshotsRes.json();
        setSnapshots(data.snapshots || []);
      } else {
        setSnapshots([]);
      }

      if (projectionsRes.ok) {
        const data = await projectionsRes.json();
        const netWorthSeries: ProjectedPoint[] = data.result?.series?.netWorth || [];
        setProjected(netWorthSeries);
      } else {
        setProjected([]);
      }
    } catch {
      setSnapshots([]);
      setProjected([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId]);

  const handleTakeSnapshot = async () => {
    if (!selectedScenarioId || snapshotting) return;
    setSnapshotting(true);

    try {
      const res = await fetch("/api/net-worth-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenarioId }),
      });

      if (res.ok) {
        toast.success("Snapshot saved!");
        // Refetch snapshots
        const refetchRes = await fetch(
          `/api/net-worth-snapshots?scenarioId=${selectedScenarioId}`
        );
        if (refetchRes.ok) {
          const data = await refetchRes.json();
          setSnapshots(data.snapshots || []);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to take snapshot");
      }
    } catch {
      toast.error("Failed to take snapshot");
    } finally {
      setSnapshotting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/net-worth-snapshots/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Snapshot deleted");
        const refetchRes = await fetch(
          `/api/net-worth-snapshots?scenarioId=${selectedScenarioId}`
        );
        if (refetchRes.ok) {
          const data = await refetchRes.json();
          setSnapshots(data.snapshots || []);
        }
      } else {
        toast.error("Failed to delete snapshot");
      }
    } catch {
      toast.error("Failed to delete snapshot");
    }
  };

  if (!selectedScenarioId) return <PageSkeleton />;
  if (loading) return <PageSkeleton />;

  if (snapshots.length === 0 && projected.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Net Worth History</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Track your actual net worth against projections
            </p>
          </div>
          <button
            onClick={handleTakeSnapshot}
            disabled={snapshotting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {snapshotting ? "Taking..." : "Take Snapshot"}
          </button>
        </div>
        <EmptyState
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          }
          title="No History Yet"
          description="Take your first snapshot to start tracking your net worth over time."
        />
      </div>
    );
  }

  // Derive summary values
  const sortedByDate = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );
  const latest = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1] : null;
  const earliest = sortedByDate.length > 1 ? sortedByDate[0] : null;
  const trend = latest && earliest ? latest.netWorth - earliest.netWorth : null;

  // Map snapshots for chart (chronological order)
  const chartSnapshots = sortedByDate.map((s) => ({
    date: s.snapshotDate,
    netWorth: s.netWorth,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Net Worth History</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track your actual net worth against projections
          </p>
        </div>
        <button
          onClick={handleTakeSnapshot}
          disabled={snapshotting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {snapshotting ? "Taking..." : "Take Snapshot"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Net Worth */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 mb-1">Current Net Worth</div>
          <div className="text-2xl font-semibold">
            {latest ? formatCurrency(latest.netWorth) : "No snapshots"}
          </div>
          {latest && (
            <div className="text-xs text-zinc-500 mt-1">
              as of {formatAxisDate(latest.snapshotDate)}
            </div>
          )}
        </div>

        {/* Total Snapshots */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 mb-1">Total Snapshots</div>
          <div className="text-2xl font-semibold">{snapshots.length}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {snapshots.length === 1 ? "snapshot recorded" : "snapshots recorded"}
          </div>
        </div>

        {/* Trend */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs text-zinc-500 mb-1">Trend</div>
          {trend !== null ? (
            <>
              <div
                className={`text-2xl font-semibold ${
                  trend >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {trend >= 0 ? "+" : ""}
                {formatCurrency(trend)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                since {formatAxisDate(earliest!.snapshotDate)}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-semibold text-zinc-500">--</div>
              <div className="text-xs text-zinc-500 mt-1">Need 2+ snapshots</div>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      {(projected.length >= 2 || chartSnapshots.length >= 2) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-8">Net Worth Over Time</h2>
          <NetWorthHistoryChart
            snapshots={chartSnapshots}
            projected={projected}
            height={350}
          />
        </div>
      )}

      {/* Snapshot Table */}
      {snapshots.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-medium mb-4">Snapshots</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                  <th className="text-left p-4">Date</th>
                  <th className="text-right p-4">Assets</th>
                  <th className="text-right p-4">Liabilities</th>
                  <th className="text-right p-4">Net Worth</th>
                  <th className="text-left p-4">Notes</th>
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-zinc-800/50">
                    <td className="p-4 text-zinc-200">
                      {formatAxisDate(snapshot.snapshotDate)}
                    </td>
                    <td className="p-4 text-right text-zinc-300">
                      {formatCurrency(snapshot.totalAssets)}
                    </td>
                    <td className="p-4 text-right text-zinc-300">
                      {formatCurrency(snapshot.totalLiabilities)}
                    </td>
                    <td
                      className={`p-4 text-right font-medium ${
                        snapshot.netWorth >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatCurrency(snapshot.netWorth)}
                    </td>
                    <td className="p-4 text-zinc-500 max-w-[200px] truncate">
                      {snapshot.notes || "--"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(snapshot.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                        title="Delete snapshot"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
