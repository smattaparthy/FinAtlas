"use client";

import { useEffect, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  DEFAULT_RULES,
  type CategorizationRule,
} from "@/lib/categorization/defaultRules";

const STORAGE_KEY = "finatlas_categorization_rules";

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: "Contains",
  startsWith: "Starts With",
  exact: "Exact Match",
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  contains: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  startsWith: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  exact: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Transportation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Food: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Utilities: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Health: "bg-red-500/20 text-red-400 border-red-500/30",
  Insurance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Shopping: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Education: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Childcare: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Subscriptions: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  Pets: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  Travel: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Charity: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

function generateId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CategorizationPage() {
  const { selectedScenarioId, isLoading: scenarioLoading, error: scenarioError } = useScenario();
  const toast = useToast();
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state for add/edit
  const [formPattern, setFormPattern] = useState("");
  const [formMatchType, setFormMatchType] = useState<"contains" | "startsWith" | "exact">("contains");
  const [formCategory, setFormCategory] = useState("");

  // Load rules from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed);
        } else {
          setRules(DEFAULT_RULES);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
        }
      } else {
        setRules(DEFAULT_RULES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
      }
    } catch {
      setRules(DEFAULT_RULES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
    }
    setLoaded(true);
  }, []);

  // Persist rules to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
  }, [rules, loaded]);

  function startAdd() {
    setAddingNew(true);
    setEditingId(null);
    setFormPattern("");
    setFormMatchType("contains");
    setFormCategory("");
  }

  function startEdit(rule: CategorizationRule) {
    setEditingId(rule.id);
    setAddingNew(false);
    setFormPattern(rule.pattern);
    setFormMatchType(rule.matchType);
    setFormCategory(rule.category);
  }

  function cancelForm() {
    setAddingNew(false);
    setEditingId(null);
    setFormPattern("");
    setFormMatchType("contains");
    setFormCategory("");
  }

  function saveNewRule() {
    if (!formPattern.trim() || !formCategory.trim()) {
      toast.warning("Pattern and category are required");
      return;
    }
    const newRule: CategorizationRule = {
      id: generateId(),
      pattern: formPattern.trim(),
      matchType: formMatchType,
      category: formCategory.trim(),
    };
    setRules([newRule, ...rules]);
    cancelForm();
    toast.success("Rule added");
  }

  function saveEditedRule() {
    if (!formPattern.trim() || !formCategory.trim()) {
      toast.warning("Pattern and category are required");
      return;
    }
    setRules(
      rules.map((r) =>
        r.id === editingId
          ? { ...r, pattern: formPattern.trim(), matchType: formMatchType, category: formCategory.trim() }
          : r
      )
    );
    cancelForm();
    toast.success("Rule updated");
  }

  function deleteRule(id: string) {
    setConfirmDeleteId(null);
    setRules(rules.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  }

  function resetToDefaults() {
    setConfirmResetOpen(false);
    setRules(DEFAULT_RULES);
    cancelForm();
    toast.success("Rules reset to defaults");
  }

  async function handleAutoCategorize() {
    if (!selectedScenarioId) {
      toast.warning("No scenario selected");
      return;
    }
    setCategorizing(true);
    try {
      const res = await fetch("/api/expenses/auto-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenarioId, rules }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to auto-categorize");
      }
      const data = await res.json();
      if (data.categorizedCount > 0) {
        toast.success(`Categorized ${data.categorizedCount} expense${data.categorizedCount === 1 ? "" : "s"}`);
      } else {
        toast.info("No uncategorized expenses matched the rules");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to auto-categorize");
    } finally {
      setCategorizing(false);
    }
  }

  if (scenarioLoading || !loaded) {
    return <PageSkeleton />;
  }

  if (scenarioError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{scenarioError}</div>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    );
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

  const inlineFormRow = (
    <tr className="bg-zinc-900/50">
      <td className="px-4 py-3">
        <input
          type="text"
          value={formPattern}
          onChange={(e) => setFormPattern(e.target.value)}
          placeholder="e.g. rent, grocery..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          autoFocus
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={formMatchType}
          onChange={(e) => setFormMatchType(e.target.value as "contains" | "startsWith" | "exact")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="contains">Contains</option>
          <option value="startsWith">Starts With</option>
          <option value="exact">Exact Match</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={formCategory}
          onChange={(e) => setFormCategory(e.target.value)}
          placeholder="e.g. Housing, Food..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={addingNew ? saveNewRule : saveEditedRule}
            className="px-3 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-700 rounded-lg hover:border-emerald-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={cancelForm}
            className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorization Rules</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Define rules to automatically categorize your expenses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmResetOpen(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleAutoCategorize}
            disabled={categorizing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {categorizing ? "Categorizing..." : "Auto-Categorize"}
          </button>
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset to Defaults"
        description="This will replace all your custom rules with the default set. This action cannot be undone."
        confirmLabel="Reset"
        destructive
        onConfirm={resetToDefaults}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Rule"
        description="Are you sure you want to delete this categorization rule?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDeleteId && deleteRule(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Rules</div>
          <div className="text-2xl font-semibold mt-1">{rules.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Categories</div>
          <div className="text-2xl font-semibold mt-1">
            {new Set(rules.map((r) => r.category)).size}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Match Types</div>
          <div className="text-2xl font-semibold mt-1">
            {new Set(rules.map((r) => r.matchType)).size}
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">{rules.length} rules</span>
          <button
            onClick={startAdd}
            disabled={addingNew || !!editingId}
            className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            Add Rule
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Pattern</th>
              <th className="px-4 py-3 font-medium">Match Type</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {addingNew && inlineFormRow}
            {rules.map((rule) =>
              editingId === rule.id ? (
                <tr key={rule.id} className="bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={formPattern}
                      onChange={(e) => setFormPattern(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={formMatchType}
                      onChange={(e) => setFormMatchType(e.target.value as "contains" | "startsWith" | "exact")}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="contains">Contains</option>
                      <option value="startsWith">Starts With</option>
                      <option value="exact">Exact Match</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-50 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={saveEditedRule}
                        className="px-3 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-700 rounded-lg hover:border-emerald-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelForm}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={rule.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-50">{rule.pattern}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                        MATCH_TYPE_COLORS[rule.matchType] || "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
                      }`}
                    >
                      {MATCH_TYPE_LABELS[rule.matchType] || rule.matchType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                        CATEGORY_COLORS[rule.category] || "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
                      }`}
                    >
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(rule)}
                        disabled={addingNew || !!editingId}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(rule.id)}
                        disabled={addingNew || !!editingId}
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {rules.length === 0 && !addingNew && (
          <div className="text-center py-12 text-zinc-500">
            No rules defined. Add a rule or reset to defaults.
          </div>
        )}
      </div>
    </div>
  );
}
