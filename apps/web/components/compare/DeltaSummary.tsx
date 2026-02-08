"use client";

import type { AnnualSummaryRow } from "@finatlas/engine/src/types";
import { formatCompactCurrency } from "@/lib/format";
import { SCENARIO_COLORS } from "./ScenarioComparisonPicker";

interface ScenarioSummary {
  name: string;
  annual: AnnualSummaryRow[];
}

interface DeltaSummaryProps {
  scenarios: ScenarioSummary[];
}

export default function DeltaSummary({ scenarios }: DeltaSummaryProps) {
  if (scenarios.length < 2) return null;

  const insights: { icon: React.ReactNode; text: string; type: "positive" | "negative" | "neutral" }[] = [];

  // Compare final net worth
  const finalNetWorths = scenarios.map((s) => ({
    name: s.name,
    value: s.annual[s.annual.length - 1]?.endNetWorth ?? 0,
  }));

  const sorted = [...finalNetWorths].sort((a, b) => b.value - a.value);
  if (sorted.length >= 2) {
    const delta = sorted[0].value - sorted[1].value;
    insights.push({
      icon: <TrendUpIcon />,
      text: `${sorted[0].name} has ${formatCompactCurrency(delta)} more net worth at year ${scenarios[0].annual.length}`,
      type: delta > 0 ? "positive" : "neutral",
    });
  }

  // Compare average annual savings
  const avgSavings = scenarios.map((s) => {
    const total = s.annual.reduce((sum, row) => sum + row.netSavings, 0);
    return { name: s.name, value: s.annual.length > 0 ? total / s.annual.length : 0 };
  });

  const sortedSavings = [...avgSavings].sort((a, b) => b.value - a.value);
  if (sortedSavings.length >= 2 && Math.abs(sortedSavings[0].value - sortedSavings[1].value) > 100) {
    const delta = sortedSavings[0].value - sortedSavings[1].value;
    insights.push({
      icon: <PiggyIcon />,
      text: `${sortedSavings[0].name} saves ${formatCompactCurrency(delta)} more annually on average`,
      type: "positive",
    });
  }

  // Compare when $1M net worth is reached
  const milestones = scenarios.map((s) => {
    const yearTo1M = s.annual.findIndex((row) => row.endNetWorth >= 1_000_000);
    return { name: s.name, year: yearTo1M >= 0 ? s.annual[yearTo1M]?.year : null };
  });

  const reachingMilestones = milestones.filter((m) => m.year !== null);
  if (reachingMilestones.length >= 2) {
    const sortedM = [...reachingMilestones].sort((a, b) => a.year! - b.year!);
    const diff = sortedM[sortedM.length - 1].year! - sortedM[0].year!;
    if (diff > 0) {
      insights.push({
        icon: <MilestoneIcon />,
        text: `${sortedM[0].name} reaches $1M ${diff} year${diff > 1 ? "s" : ""} earlier`,
        type: "positive",
      });
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`
            rounded-xl border p-4 flex items-start gap-3
            ${
              insight.type === "positive"
                ? "border-emerald-900/50 bg-emerald-950/30"
                : insight.type === "negative"
                ? "border-red-900/50 bg-red-950/30"
                : "border-zinc-800 bg-zinc-900/50"
            }
          `}
        >
          <div className={`shrink-0 mt-0.5 ${insight.type === "positive" ? "text-emerald-400" : insight.type === "negative" ? "text-red-400" : "text-zinc-400"}`}>
            {insight.icon}
          </div>
          <p className="text-sm text-zinc-300">{insight.text}</p>
        </div>
      ))}
    </div>
  );
}

function TrendUpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function PiggyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MilestoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}
