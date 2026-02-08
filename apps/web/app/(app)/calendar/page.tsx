"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";

interface CalendarEvent {
  id: string;
  date: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "LOAN_PAYOFF" | "GOAL" | "LIFE_EVENT";
  amount?: number;
  color: string;
}

const typeColors: Record<
  string,
  { dot: string; badge: string; text: string }
> = {
  INCOME: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400",
    text: "Income",
  },
  EXPENSE: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-400",
    text: "Expense",
  },
  LOAN_PAYOFF: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-400",
    text: "Loan Payoff",
  },
  GOAL: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-400",
    text: "Goal",
  },
  LIFE_EVENT: {
    dot: "bg-purple-500",
    badge: "bg-purple-500/10 text-purple-400",
    text: "Life Event",
  },
};

export default function CalendarPage() {
  const { selectedScenarioId } = useScenario();
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!selectedScenarioId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendar-events?scenarioId=${selectedScenarioId}&year=${currentYear}&month=${currentMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, currentYear, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = useCallback(() => {
    setSelectedDay(null);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    setSelectedDay(null);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const monthDisplay = useMemo(() => {
    return new Date(currentYear, currentMonth - 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentYear, currentMonth]);

  const { firstDayOfWeek, daysInMonth } = useMemo(() => {
    return {
      firstDayOfWeek: new Date(currentYear, currentMonth - 1, 1).getDay(),
      daysInMonth: new Date(currentYear, currentMonth, 0).getDate(),
    };
  }, [currentYear, currentMonth]);

  const eventsByDay = useMemo(() => {
    const byDay: Record<number, CalendarEvent[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.date);
      const day = eventDate.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(event);
    });
    return byDay;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return eventsByDay[selectedDay] || [];
  }, [selectedDay, eventsByDay]);

  const today = useMemo(() => {
    const now = new Date();
    if (
      now.getFullYear() === currentYear &&
      now.getMonth() + 1 === currentMonth
    ) {
      return now.getDate();
    }
    return null;
  }, [currentYear, currentMonth]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-50">
          Financial Calendar
        </h1>
        <p className="text-zinc-400 mt-1">
          View all your financial events and deadlines
        </p>
      </div>

      {/* Month Navigation */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 flex justify-between items-center">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5 text-zinc-400 hover:text-zinc-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-lg font-medium text-zinc-50">{monthDisplay}</h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5 text-zinc-400 hover:text-zinc-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Color Legend */}
      <div className="flex gap-4 text-xs text-zinc-400 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Expense</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Loan Payoff</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Goal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Life Event</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        {/* Day Names */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-xs text-zinc-500 text-center py-2 font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-px bg-zinc-800/30">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] bg-zinc-950/60" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay[day] || [];
            const isSelected = selectedDay === day;
            const isToday = today === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[80px] bg-zinc-950/60 p-1.5 text-left transition-colors hover:bg-zinc-800/30 ${
                  isSelected
                    ? "bg-zinc-800/50 border border-emerald-500/50"
                    : "border border-zinc-800/50"
                }`}
              >
                <div
                  className={`text-xs mb-1 ${
                    isToday ? "text-emerald-400 font-semibold" : "text-zinc-400"
                  }`}
                >
                  {day}
                </div>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`w-2 h-2 rounded-full ${
                        typeColors[event.type]?.dot || "bg-zinc-500"
                      }`}
                      title={event.name}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-zinc-500 ml-0.5">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Event Detail Panel */}
      {selectedDay !== null && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h3 className="text-lg font-medium text-zinc-50 mb-4">
            Events on {monthDisplay.split(" ")[0]} {selectedDay}
          </h3>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-zinc-400">No events on this day</p>
          ) : (
            <div className="space-y-0">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0"
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      typeColors[event.type]?.dot || "bg-zinc-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">
                      {event.name}
                    </p>
                    {event.amount && (
                      <p className="text-sm text-zinc-400">
                        {formatCurrency(event.amount)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      typeColors[event.type]?.badge || "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {typeColors[event.type]?.text || event.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-zinc-400 text-center">
        {events.length === 0 ? (
          <p>
            No financial events this month. Events are automatically generated
            from your income, expenses, loans, goals, and life events.
          </p>
        ) : (
          <p>{events.length} events this month</p>
        )}
      </div>
    </div>
  );
}
