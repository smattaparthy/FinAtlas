"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import LifeEventForm from "@/components/milestones/LifeEventForm";

type LifeEvent = {
  id: string;
  name: string;
  type: string;
  targetDate: string;
  description: string | null;
  color: string;
  icon: string | null;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  BUY_HOUSE: "Buy a House",
  HAVE_BABY: "Have a Baby",
  RETIRE_EARLY: "Retire Early",
  CAREER_CHANGE: "Career Change",
  CUSTOM: "Custom",
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  BUY_HOUSE: "\u{1F3E0}",
  HAVE_BABY: "\u{1F476}",
  RETIRE_EARLY: "\u{1F3D6}",
  CAREER_CHANGE: "\u{1F504}",
  CUSTOM: "\u{2B50}",
};

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTimeUntil(dateStr: string): { label: string; isPast: boolean } {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return { label: "Past", isPast: true };

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return { label: `${diffDays}d`, isPast: false };

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return { label: `${diffMonths}mo`, isPast: false };

  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  if (remainingMonths > 0) return { label: `${diffYears}y ${remainingMonths}mo`, isPast: false };
  return { label: `${diffYears}y`, isPast: false };
}

export default function MilestonesPage() {
  const { selectedScenarioId } = useScenario();
  const toast = useToast();
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch(`/api/life-events?scenarioId=${selectedScenarioId}`);
        if (!res.ok) throw new Error("Failed to fetch life events");
        const data = await res.json();
        setEvents(data.lifeEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [selectedScenarioId]);

  async function handleCreate(data: {
    name: string;
    type: string;
    targetDate: string;
    description: string | null;
    color: string;
  }) {
    const res = await fetch("/api/life-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, scenarioId: selectedScenarioId }),
    });
    if (!res.ok) throw new Error("Failed to create life event");
    const { lifeEvent } = await res.json();
    setEvents((prev) => [...prev, lifeEvent].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));
    setShowForm(false);
    toast.success("Life event created");
  }

  async function handleUpdate(data: {
    name: string;
    type: string;
    targetDate: string;
    description: string | null;
    color: string;
  }) {
    if (!editingEvent) return;
    const res = await fetch(`/api/life-events/${editingEvent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update life event");
    const { lifeEvent } = await res.json();
    setEvents((prev) =>
      prev
        .map((e) => (e.id === lifeEvent.id ? lifeEvent : e))
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
    );
    setEditingEvent(null);
    toast.success("Life event updated");
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    try {
      const res = await fetch(`/api/life-events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Life event deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Milestones</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Plan and visualize key life events on your financial timeline
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingEvent(null); }}
          className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
        >
          Add Event
        </button>
      </div>

      {/* Form Modal */}
      {(showForm || editingEvent) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg">
            <LifeEventForm
              initial={editingEvent ?? undefined}
              onSubmit={editingEvent ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingEvent(null); }}
            />
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Life Event"
        description="Are you sure you want to delete this life event? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Timeline */}
      {events.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No milestones yet"
          description="Add life events to visualize them on your financial projection timeline"
          actionLabel="Add your first milestone"
          actionHref="#"
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-800" />

          <div className="space-y-6">
            {events.map((event) => {
              const timeUntil = getTimeUntil(event.targetDate);
              return (
                <div key={event.id} className="relative flex items-start gap-4 pl-12">
                  {/* Timeline dot */}
                  <div
                    className="absolute left-4 top-4 w-5 h-5 rounded-full border-2 border-zinc-950 flex items-center justify-center text-xs"
                    style={{ backgroundColor: event.color }}
                  >
                    <div className="w-2 h-2 rounded-full bg-zinc-950" />
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {EVENT_TYPE_ICONS[event.type] || "\u{2B50}"}
                        </span>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {EVENT_TYPE_LABELS[event.type] || event.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-lg ${
                            timeUntil.isPast
                              ? "bg-zinc-700 text-zinc-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {timeUntil.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-zinc-400">
                      {formatEventDate(event.targetDate)}
                    </div>

                    {event.description && (
                      <div className="mt-2 text-sm text-zinc-500">{event.description}</div>
                    )}

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(event.id)}
                        disabled={deleting === event.id}
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleting === event.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
