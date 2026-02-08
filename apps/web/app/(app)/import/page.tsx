"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import CSVImportWizard from "@/components/import/CSVImportWizard";
import { generateTemplate } from "@/lib/csv/templates";

type ImportType = "income" | "expense" | "account" | "loan";

type ImportLog = {
  id: string;
  type: string;
  fileName: string;
  rowsImported: number;
  status: string;
  errorDetails: string | null;
  createdAt: string;
};

const TYPE_CARDS: {
  type: ImportType;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "income",
    title: "Income",
    description: "Salaries, freelance, rental income, and other revenue sources",
    icon: (
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
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
      </svg>
    ),
  },
  {
    type: "expense",
    title: "Expense",
    description: "Monthly bills, subscriptions, and recurring expenses",
    icon: (
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
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
        />
      </svg>
    ),
  },
  {
    type: "account",
    title: "Account",
    description: "Investment accounts, retirement funds, and savings",
    icon: (
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
          d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
        />
      </svg>
    ),
  },
  {
    type: "loan",
    title: "Loan",
    description: "Mortgages, auto loans, student loans, and other debts",
    icon: (
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
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
  },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  income: "bg-emerald-950 text-emerald-300 border-emerald-800",
  expense: "bg-rose-950 text-rose-300 border-rose-800",
  account: "bg-blue-950 text-blue-300 border-blue-800",
  loan: "bg-amber-950 text-amber-300 border-amber-800",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  success: "bg-emerald-950 text-emerald-300 border-emerald-800",
  partial: "bg-amber-950 text-amber-300 border-amber-800",
  error: "bg-red-950 text-red-300 border-red-800",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadTemplate(type: ImportType) {
  const csv = generateTemplate(type);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const {
    selectedScenarioId,
    isLoading: scenarioLoading,
  } = useScenario();
  const toast = useToast();

  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!selectedScenarioId) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(
        `/api/import/history?scenarioId=${selectedScenarioId}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Silently fail on history fetch
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleComplete = useCallback(
    (count: number) => {
      toast.success(`Successfully imported ${count} item${count !== 1 ? "s" : ""}`);
      setSelectedType(null);
      fetchHistory();
    },
    [toast, fetchHistory]
  );

  const handleCancel = useCallback(() => {
    setSelectedType(null);
  }, []);

  if (scenarioLoading) {
    return <PageSkeleton />;
  }

  if (!selectedScenarioId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Import Data</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Select a scenario to begin importing data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Import your financial data from CSV files. Choose a data type to get started.
        </p>
      </div>

      {/* Type Selector Cards */}
      {!selectedType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TYPE_CARDS.map((card) => (
            <button
              key={card.type}
              onClick={() => setSelectedType(card.type)}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-left transition-all hover:border-emerald-700 hover:bg-zinc-900/60 group"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800/60 text-emerald-400 mb-3 group-hover:bg-emerald-950/60 transition-colors">
                {card.icon}
              </div>
              <h3 className="font-medium text-zinc-50 mb-1">{card.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Selected Type: Template Download + Wizard */}
      {selectedType && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedType(null)}
              className="text-zinc-400 hover:text-zinc-50 transition-colors"
              aria-label="Go back to type selection"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold">
              Import {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Data
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-200">
                  Need a template?
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Download a CSV template with the correct headers and example data.
                </p>
              </div>
              <button
                onClick={() => downloadTemplate(selectedType)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Download Template
              </button>
            </div>
          </div>

          <CSVImportWizard
            type={selectedType}
            scenarioId={selectedScenarioId}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Import History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Import History</h2>

        {loadingLogs ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h.008v.008h-.008V15zm-6 0h.008v.008H6.75V15zm0 3h.008v.008H6.75V18zm3 0h.008v.008H9.75V18zm3 0h.008v.008h-.008V18zM5.625 4.5H9.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H5.625M5.625 4.5A1.875 1.875 0 003.75 6.375v11.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V6.375A1.875 1.875 0 0018.375 4.5H5.625z"
                />
              </svg>
            }
            title="No import history yet"
            description="Import data from CSV files to see your history here."
          />
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                      File Name
                    </th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                      Rows
                    </th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-800/50 last:border-b-0"
                    >
                      <td className="py-3 px-4 text-zinc-300">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            TYPE_BADGE_COLORS[log.type] ||
                            "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}
                        >
                          {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 truncate max-w-[200px]">
                        {log.fileName}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {log.rowsImported}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            STATUS_BADGE_COLORS[log.status] ||
                            "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}
                        >
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
