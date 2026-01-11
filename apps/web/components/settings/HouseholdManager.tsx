"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  scenarios: {
    id: string;
    name: string;
    isBaseline: boolean;
  }[];
  members: {
    id: string;
    name: string;
    roleTag: string | null;
  }[];
  _count: {
    members: number;
  };
}

interface HouseholdManagerProps {
  initialHouseholds: Household[];
}

export function HouseholdManager({ initialHouseholds }: HouseholdManagerProps) {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [editHouseholdName, setEditHouseholdName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHouseholdName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create household");
      }

      const data = await response.json();
      setHouseholds([data.household, ...households]);
      setNewHouseholdName("");
      setIsCreating(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create household");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelCreate() {
    setIsCreating(false);
    setNewHouseholdName("");
    setError(null);
  }

  function handleStartEdit(household: Household) {
    setEditingId(household.id);
    setEditHouseholdName(household.name);
    setError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditHouseholdName("");
    setError(null);
  }

  async function handleUpdateHousehold(householdId: string, e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/households/${householdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editHouseholdName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update household");
      }

      const data = await response.json();
      setHouseholds(households.map(h => h.id === householdId ? data.household : h));
      setEditingId(null);
      setEditHouseholdName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update household");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Household Information</h2>
            <p className="text-sm text-zinc-400 mt-1">Your financial planning households</p>
          </div>
          {households.length > 0 && !isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              + New Household
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Create Household Form */}
        {isCreating && (
          <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <h3 className="text-sm font-medium mb-3">Create New Household</h3>
            <form onSubmit={handleCreateHousehold} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Household Name *
                </label>
                <input
                  type="text"
                  required
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., My Family, Smith Household"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !newHouseholdName.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Creating..." : "Create Household"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Households List */}
        {households.length > 0 ? (
          <div className="space-y-4">
            {households.map((household) => (
              <div key={household.id} className="border border-zinc-800 rounded-xl p-4">
                {/* Edit Mode */}
                {editingId === household.id ? (
                  <form onSubmit={(e) => handleUpdateHousehold(household.id, e)} className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Household Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editHouseholdName}
                        onChange={(e) => setEditHouseholdName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={loading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading || !editHouseholdName.trim()}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-zinc-100 text-lg">{household.name}</h3>
                          <button
                            onClick={() => handleStartEdit(household)}
                            className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title="Edit household name"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 text-center">
                        <div>
                          <p className="text-xs text-zinc-500">Scenarios</p>
                          <p className="text-lg font-semibold text-zinc-100">{household.scenarios.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Members</p>
                          <p className="text-lg font-semibold text-zinc-100">{household._count.members}</p>
                        </div>
                      </div>
                    </div>

                    {/* Members Section */}
                    {household.members.length > 0 && (
                      <div className="mb-3 pb-3 border-b border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">Household Members:</p>
                        <div className="flex flex-wrap gap-2">
                          {household.members.map((member) => (
                            <div
                              key={member.id}
                              className="px-2 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-300"
                            >
                              {member.name}
                              {member.roleTag && (
                                <span className="ml-1.5 text-zinc-500">({member.roleTag})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-zinc-400">Created:</span>{' '}
                          {new Date(household.createdAt).toLocaleDateString('en-US')}
                        </div>
                        <div>
                          <span className="text-zinc-400">Updated:</span>{' '}
                          {new Date(household.updatedAt).toLocaleDateString('en-US')}
                        </div>
                      </div>
                      <Link
                        href="/members"
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                      >
                        Manage Members →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-500">No households created yet</p>
            <p className="text-sm text-zinc-400 mt-1 mb-4">
              Create a household to start your financial planning
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              + Create Your First Household
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
