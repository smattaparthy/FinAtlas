"use client";

import { useState, useEffect } from "react";

export function AnthropicKeyManager() {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  async function fetchKeyStatus() {
    try {
      const res = await fetch("/api/user/anthropic-key");
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      }
    } catch (error) {
      console.error("Error fetching API key status:", error);
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Please enter an API key" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/anthropic-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setHasKey(true);
        setMaskedKey(data.maskedKey);
        setApiKey("");
        setIsEditing(false);
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save API key" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Are you sure you want to remove your Anthropic API key?")) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/anthropic-key", {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setHasKey(false);
        setMaskedKey(null);
        setApiKey("");
        setIsEditing(false);
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to remove API key" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setApiKey("");
    setIsEditing(false);
    setMessage(null);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium">Anthropic API Key</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Configure your API key for AI-powered financial insights
            </p>
          </div>
          <svg
            className="w-5 h-5 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Message display */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-emerald-950/50 border border-emerald-900/50 text-emerald-400"
                : "bg-red-950/50 border border-red-900/50 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Display current key or edit form */}
        {!isEditing && hasKey ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Current API Key</label>
              <div className="mt-2 flex items-center gap-3">
                <code className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm">
                  {maskedKey}
                </code>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-red-900/30 text-red-400 text-sm font-medium hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="font-medium text-zinc-400 mb-1">🔐 Security Note:</p>
              <p>
                Your API key is stored securely and will be used for AI-powered features
                like financial insights, scenario analysis, and personalized recommendations.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!hasKey && (
              <div className="text-sm text-zinc-400 bg-blue-950/20 border border-blue-900/30 rounded-lg p-3">
                <p className="font-medium text-blue-400 mb-1">Getting Started</p>
                <p className="mb-2">
                  To enable AI features, you&apos;ll need an Anthropic API key. Get yours at{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>
            )}

            <div>
              <label className="text-sm text-zinc-400 block mb-2">
                {hasKey ? "New API Key" : "Anthropic API Key"}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Your API key should start with &quot;sk-ant-&quot;
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : hasKey ? "Update Key" : "Save Key"}
              </button>
              {hasKey && (
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI Features preview */}
        <div className="pt-4 border-t border-zinc-800">
          <p className="text-sm font-medium text-zinc-300 mb-3">Upcoming AI Features</p>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Intelligent financial insights and recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Natural language scenario analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Personalized retirement planning strategies</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Automated financial report summaries</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
