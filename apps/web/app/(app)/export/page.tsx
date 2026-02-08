"use client";

import { useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

type ExportType = "incomes" | "expenses" | "loans" | "accounts" | "goals";

interface ExportCard {
  type: ExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function ExportPage() {
  const { selectedScenarioId, isLoading: scenarioLoading } = useScenario();
  const toast = useToast();
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});

  const exportCards: ExportCard[] = [
    {
      type: "incomes",
      title: "Income Data",
      description: "Export all income sources with amounts and frequencies",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
      ),
    },
    {
      type: "expenses",
      title: "Expense Data",
      description: "Export all expenses with categories and amounts",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      ),
    },
    {
      type: "loans",
      title: "Loan Data",
      description: "Export all loans with balances, rates, and terms",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
          />
        </svg>
      ),
    },
    {
      type: "accounts",
      title: "Account Data",
      description: "Export all investment and savings accounts",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-400"
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
      ),
    },
    {
      type: "goals",
      title: "Goal Data",
      description: "Export all financial goals and targets",
      icon: (
        <svg
          className="w-6 h-6 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
          />
        </svg>
      ),
    },
  ];

  async function handleDownload(type: ExportType) {
    if (!selectedScenarioId) {
      toast.error("No scenario selected");
      return;
    }

    setDownloading((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/export?scenarioId=${selectedScenarioId}&type=${type}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to export");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finatlas-${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    } finally {
      setDownloading((prev) => ({ ...prev, [type]: false }));
    }
  }

  if (scenarioLoading) {
    return <PageSkeleton />;
  }

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">No scenario selected. Please create a household and scenario first.</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Export Data</h1>
        <p className="text-zinc-400 text-sm mt-1">Download your financial data as CSV files</p>
      </div>

      {/* Info Note */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div>
            <p className="text-sm text-zinc-300">
              Exports are generated from your currently selected scenario
            </p>
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportCards.map((card) => (
          <div
            key={card.type}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-start gap-3 mb-4">
              {card.icon}
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-50">{card.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{card.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(card.type)}
              disabled={downloading[card.type]}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading[card.type] ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Downloading...
                </span>
              ) : (
                "Download CSV"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
