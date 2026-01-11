"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string;
  birthDate: string | null;
  retirementAge: number | null;
  roleTag: string | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    retirementAge: "",
    roleTag: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const response = await fetch("/api/members");
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Get household ID from first scenario
      // The scenarios endpoint will auto-create household if none exists
      const scenariosRes = await fetch("/api/scenarios");
      const scenariosData = await scenariosRes.json();

      if (!scenariosRes.ok || !scenariosData.scenarios || scenariosData.scenarios.length === 0) {
        alert("Failed to initialize household. Please refresh the page and try again.");
        return;
      }

      const householdId = scenariosData.scenarios[0].householdId;

      if (editingMemberId) {
        // Update existing member
        const response = await fetch(`/api/members/${editingMemberId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to update member");
      } else {
        // Create new member
        const response = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, householdId }),
        });

        if (!response.ok) throw new Error("Failed to create member");
      }

      // Reset form and refresh list
      setFormData({ name: "", birthDate: "", retirementAge: "", roleTag: "" });
      setIsAddingMember(false);
      setEditingMemberId(null);
      fetchMembers();
    } catch (error) {
      console.error("Failed to save member:", error);
      alert("Failed to save member. Please try again.");
    }
  }

  async function handleDelete(memberId: string) {
    if (!confirm("Are you sure you want to delete this member?")) return;

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete member");

      fetchMembers();
    } catch (error) {
      console.error("Failed to delete member:", error);
      alert("Failed to delete member. Please try again.");
    }
  }

  function handleEdit(member: Member) {
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      birthDate: member.birthDate?.split("T")[0] || "",
      retirementAge: member.retirementAge?.toString() || "",
      roleTag: member.roleTag || "",
    });
    setIsAddingMember(true);
  }

  function handleCancelForm() {
    setIsAddingMember(false);
    setEditingMemberId(null);
    setFormData({ name: "", birthDate: "", retirementAge: "", roleTag: "" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-50 mb-2">Family Members</h1>
        <p className="text-zinc-400">Manage your household members</p>
      </div>

      {/* Add Member Button */}
      {!isAddingMember && (
        <button
          onClick={() => setIsAddingMember(true)}
          className="mb-6 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
        >
          + Add Member
        </button>
      )}

      {/* Add/Edit Form */}
      {isAddingMember && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium mb-4">
            {editingMemberId ? "Edit Member" : "Add New Member"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter member name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Retirement Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.retirementAge}
                onChange={(e) => setFormData({ ...formData, retirementAge: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 65"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Role/Tag
              </label>
              <input
                type="text"
                value={formData.roleTag}
                onChange={(e) => setFormData({ ...formData, roleTag: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Primary, Spouse, Dependent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                {editingMemberId ? "Update Member" : "Add Member"}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">No family members yet. Add your first member above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg font-medium text-zinc-100">{member.name}</h3>
                <div className="mt-1 flex gap-4 text-sm text-zinc-400">
                  {member.birthDate && (
                    <span>Born: {new Date(member.birthDate).toLocaleDateString()}</span>
                  )}
                  {member.retirementAge && (
                    <span>Retirement Age: {member.retirementAge}</span>
                  )}
                  {member.roleTag && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {member.roleTag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="px-3 py-1.5 rounded-lg border border-red-900/50 hover:bg-red-900/20 text-red-400 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
