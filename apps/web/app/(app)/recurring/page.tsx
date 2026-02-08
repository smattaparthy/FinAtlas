"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";
import RecurringCalendar from "@/components/recurring/RecurringCalendar";

type RecurringItem = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  frequency: string;
  monthlyEquivalent: number;
  nextOccurrence: string | null;
  category: string | null;
  startDate: string;
  endDate: string | null;
  editUrl: string;
};

type Summary = {
  totalMonthlyInflows: number;
  totalMonthlyOutflows: number;
  netMonthly: number;
};

type UpcomingEvent = {
  date: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
};

type GroupBy = "type" | "frequency";

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Biweekly",
  WEEKLY: "Weekly",
  ANNUAL: "Annual",
};

const FREQUENCY_ORDER: string[] = ["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL"];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupItemsByType(items: RecurringItem[]): Record<string, RecurringItem[]> {
  const groups: Record<string, RecurringItem[]> = {};
  for (const item of items) {
    const key = item.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function groupItemsByFrequency(items: RecurringItem[]): Record<string, RecurringItem[]> {
  const groups: Record<string, RecurringItem[]> = {};
  for (const item of items) {
    const key = item.frequency;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function RecurringPage() {
  const {
    selectedScenarioId,
    isLoading: scenarioLoading,
    error: scenarioError,
  } = useScenario();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalMonthlyInflows: 0,
    totalMonthlyOutflows: 0,
    netMonthly: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("type");

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchRecurring() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/recurring?scenarioId=${selectedScenarioId}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch recurring transactions");
        }
        const data = await res.json();
        setItems(data.items);
        setSummary(data.summary);
        setUpcoming(data.upcoming);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load recurring transactions"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchRecurring();
  }, [selectedScenarioId]);

  if (scenarioLoading || (loading && selectedScenarioId)) {
    return <PageSkeleton />;
  }

  if (scenarioError || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{scenarioError || error}</div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!selectedScenarioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-zinc-400">
          No scenario selected. Please create a household and scenario first.
        </div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Grouped data
  const grouped =
    groupBy === "type"
      ? groupItemsByType(items)
      : groupItemsByFrequency(items);

  const groupKeys =
    groupBy === "type"
      ? ["INCOME", "EXPENSE"].filter((k) => grouped[k]?.length)
      : FREQUENCY_ORDER.filter((k) => grouped[k]?.length);

  const groupLabels: Record<string, string> =
    groupBy === "type"
      ? { INCOME: "Income", EXPENSE: "Expense" }
      : FREQUENCY_LABELS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Recurring Transactions</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Track all your recurring income and expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Monthly Inflows
          </div>
          <div className="text-2xl font-semibold mt-1 text-emerald-400">
            {formatCurrency(summary.totalMonthlyInflows)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Monthly Outflows
          </div>
          <div className="text-2xl font-semibold mt-1 text-red-400">
            {formatCurrency(summary.totalMonthlyOutflows)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">
            Net Monthly
          </div>
          <div
            className={`text-2xl font-semibold mt-1 ${
              summary.netMonthly >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrency(summary.netMonthly)}
          </div>
        </div>
      </div>

      {/* Group Toggle */}
      <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setGroupBy("type")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            groupBy === "type"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          By Type
        </button>
        <button
          onClick={() => setGroupBy("frequency")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            groupBy === "frequency"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          By Frequency
        </button>
      </div>

      {/* Data Table */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/60 text-zinc-400 mb-4">
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
                d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-200 mb-1">
            No recurring transactions found
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Add income or expenses with a recurring frequency to see them here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Frequency</th>
                <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">
                  Monthly Equiv
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Next Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {groupKeys.map((groupKey) => {
                const groupItems = grouped[groupKey] || [];
                return (
                  <GroupSection
                    key={groupKey}
                    label={groupLabels[groupKey] || groupKey}
                    items={groupItems}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 30-Day Calendar */}
      {upcoming.length > 0 && <RecurringCalendar upcoming={upcoming} />}
    </div>
  );
}

function GroupSection({
  label,
  items,
}: {
  label: string;
  items: RecurringItem[];
}) {
  return (
    <>
      {/* Group header */}
      <tr>
        <td
          colSpan={7}
          className="px-4 py-2 text-xs uppercase text-zinc-500 bg-zinc-900/50 font-medium tracking-wide"
        >
          {label}
        </td>
      </tr>
      {/* Group items */}
      {items.map((item) => (
        <tr
          key={item.id}
          className="hover:bg-zinc-900/50 transition-colors"
        >
          <td className="px-4 py-3">
            <span className="text-zinc-50 font-medium">{item.name}</span>
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${
                item.type === "INCOME"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              {item.type === "INCOME" ? "Income" : "Expense"}
            </span>
          </td>
          <td className="px-4 py-3 text-right font-medium">
            {formatCurrency(item.amount)}
          </td>
          <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
            {FREQUENCY_LABELS[item.frequency] || item.frequency}
          </td>
          <td className="px-4 py-3 text-right text-zinc-400 hidden lg:table-cell">
            {formatCurrency(item.monthlyEquivalent)}
          </td>
          <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
            {item.nextOccurrence ? formatDate(item.nextOccurrence) : "\u2014"}
          </td>
          <td className="px-4 py-3 text-right">
            <Link
              href={item.editUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              Edit
            </Link>
          </td>
        </tr>
      ))}
    </>
  );
}
