"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import CashFlowSankey from "@/components/charts/CashFlowSankey";
import SpendingHeatmap from "@/components/charts/SpendingHeatmap";
import AssetTreemap from "@/components/charts/AssetTreemap";

type TabId = "sankey" | "heatmap" | "treemap";

interface SankeyData {
  sources: Array<{ name: string; amount: number }>;
  targets: Array<{ name: string; amount: number }>;
  flows: Array<{ from: string; to: string; amount: number }>;
}

interface HeatmapData {
  cells: Array<{ date: string; amount: number }>;
}

interface TreemapAccount {
  name: string;
  type: string;
  value: number;
  children: Array<{ name: string; value: number }>;
}

interface TreemapData {
  accounts: TreemapAccount[];
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "sankey", label: "Cash Flow" },
  { id: "heatmap", label: "Spending Heatmap" },
  { id: "treemap", label: "Asset Allocation" },
];

export default function VisualizationsPage() {
  const { selectedScenarioId } = useScenario();
  const [activeTab, setActiveTab] = useState<TabId>("sankey");
  const [loading, setLoading] = useState(true);

  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [treemapData, setTreemapData] = useState<TreemapData | null>(null);

  const fetchTabData = useCallback(
    async (tab: TabId) => {
      if (!selectedScenarioId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/visualizations?scenarioId=${selectedScenarioId}&type=${tab}`
        );
        if (!res.ok) throw new Error("Failed to fetch visualization data");
        const json = await res.json();

        if (tab === "sankey") setSankeyData(json);
        else if (tab === "heatmap") setHeatmapData(json);
        else setTreemapData(json);
      } catch {
        if (tab === "sankey") setSankeyData(null);
        else if (tab === "heatmap") setHeatmapData(null);
        else setTreemapData(null);
      } finally {
        setLoading(false);
      }
    },
    [selectedScenarioId]
  );

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  if (!selectedScenarioId) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Advanced Visualizations</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Explore your finances through interactive charts and diagrams
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-6" aria-label="Visualization tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {loading && <PageSkeleton />}

      {/* Sankey Tab */}
      {!loading && activeTab === "sankey" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-medium mb-1">Cash Flow Sankey</h2>
          <p className="text-zinc-500 text-xs mb-4">
            How your income flows into expense categories (annualized)
          </p>
          {sankeyData &&
          sankeyData.sources.length > 0 &&
          sankeyData.targets.length > 0 ? (
            <CashFlowSankey
              sources={sankeyData.sources}
              targets={sankeyData.targets}
              flows={sankeyData.flows}
            />
          ) : (
            <EmptyState message="Add income and expense entries to see your cash flow diagram." />
          )}
        </div>
      )}

      {/* Heatmap Tab */}
      {!loading && activeTab === "heatmap" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-medium mb-1">Spending Heatmap</h2>
          <p className="text-zinc-500 text-xs mb-4">
            Daily spending intensity over the last 12 weeks
          </p>
          {heatmapData && heatmapData.cells.some((c) => c.amount > 0) ? (
            <SpendingHeatmap cells={heatmapData.cells} />
          ) : (
            <EmptyState message="Track actual expenses in the Budget page to see your spending heatmap." />
          )}
        </div>
      )}

      {/* Treemap Tab */}
      {!loading && activeTab === "treemap" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-medium mb-1">Asset Allocation Treemap</h2>
          <p className="text-zinc-500 text-xs mb-4">
            Account and holding sizes proportional to their value
          </p>
          {treemapData && treemapData.accounts.length > 0 ? (
            <AssetTreemap accounts={treemapData.accounts} />
          ) : (
            <EmptyState message="Add investment accounts with balances to see your asset allocation treemap." />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
      {message}
    </div>
  );
}
