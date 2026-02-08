"use client";

interface Insight {
  type: "positive" | "warning" | "action";
  title: string;
  description: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

const typeConfig = {
  positive: {
    border: "border-emerald-900/50",
    bg: "bg-emerald-950/30",
    iconColor: "text-emerald-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    border: "border-amber-900/50",
    bg: "bg-amber-950/30",
    iconColor: "text-amber-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  action: {
    border: "border-blue-900/50",
    bg: "bg-blue-950/30",
    iconColor: "text-blue-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
};

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Insights</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => {
          const config = typeConfig[insight.type];
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 flex items-start gap-3 ${config.border} ${config.bg}`}
            >
              <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
                {config.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-200">{insight.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
