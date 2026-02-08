"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface UpcomingEvent {
  date: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
}

interface RecurringCalendarProps {
  upcoming: UpcomingEvent[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function RecurringCalendar({ upcoming }: RecurringCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const { days, eventsByDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 30 days starting from today
    const daysList: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      daysList.push(d);
    }

    // Group events by date string
    const evtMap: Record<string, UpcomingEvent[]> = {};
    for (const evt of upcoming) {
      if (!evtMap[evt.date]) evtMap[evt.date] = [];
      evtMap[evt.date].push(evt);
    }

    return { days: daysList, eventsByDate: evtMap };
  }, [upcoming]);

  // Build the calendar grid
  // Start with padding for the first day of the week
  const todayStr = days[0]?.toISOString().split("T")[0] ?? "";

  // Get the day of week for the first day (0 = Sunday, adjust to Mon-based)
  const firstDayOfWeek = days[0]?.getDay() ?? 0;
  // Convert to Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Create the grid cells: null for padding, Date for actual days
  const gridCells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    gridCells.push(null);
  }
  for (const day of days) {
    gridCells.push(day);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <h3 className="text-lg font-semibold mb-4">Upcoming 30 Days</h3>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs text-zinc-500 font-medium py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {gridCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="min-h-[60px]" />;
          }

          const dateStr = cell.toISOString().split("T")[0];
          const isToday = dateStr === todayStr;
          const dayEvents = eventsByDate[dateStr] || [];
          const hasEvents = dayEvents.length > 0;
          const hasIncome = dayEvents.some((e) => e.type === "INCOME");
          const hasExpense = dayEvents.some((e) => e.type === "EXPENSE");

          return (
            <div
              key={dateStr}
              className={`relative rounded-lg p-2 min-h-[60px] transition-colors ${
                isToday
                  ? "ring-1 ring-emerald-500 bg-zinc-800/30"
                  : hasEvents
                  ? "bg-zinc-900/50"
                  : ""
              } ${hasEvents ? "cursor-pointer hover:bg-zinc-800/40" : ""}`}
              onMouseEnter={() => hasEvents && setHoveredDay(dateStr)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div className="text-xs text-zinc-500">{cell.getDate()}</div>

              {/* Event dots */}
              {hasEvents && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {hasIncome && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {hasExpense && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  )}
                  {dayEvents.length > 1 && (
                    <span className="text-[10px] text-zinc-500 leading-none">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip */}
              {hoveredDay === dateStr && hasEvents && (
                <div className="absolute z-20 left-0 top-full mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl p-3 space-y-1.5">
                  <div className="text-xs font-medium text-zinc-300 mb-2">
                    {formatShortDate(cell)}
                  </div>
                  {dayEvents.map((evt, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            evt.type === "INCOME" ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                        <span className="text-zinc-300 truncate max-w-[120px]">
                          {evt.name}
                        </span>
                      </div>
                      <span
                        className={
                          evt.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {evt.type === "EXPENSE" ? "-" : "+"}
                        {formatCurrency(evt.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Income
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Expense
        </div>
      </div>
    </div>
  );
}
