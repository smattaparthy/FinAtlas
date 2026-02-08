"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface ShareTokenItem {
  id: string;
  token: string;
  url: string;
  expiresAt: string | null;
  accessCount: number;
  createdAt: string;
}

interface ShareDialogProps {
  scenarioId: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ scenarioId, open, onClose }: ShareDialogProps) {
  const toast = useToast();
  const [tokens, setTokens] = useState<ShareTokenItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number | null>(30);

  useEffect(() => {
    if (!open) return;
    fetchTokens();
  }, [open, scenarioId]);

  async function fetchTokens() {
    setLoading(true);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/share`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: expiryDays }),
      });
      if (!res.ok) throw new Error("Failed to create share link");
      const data = await res.json();
      setTokens((prev) => [data.shareToken, ...prev]);

      // Copy to clipboard
      const fullUrl = `${window.location.origin}${data.shareToken.url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Share link created and copied to clipboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/share/${tokenId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      toast.success("Share link revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  async function copyLink(url: string) {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 max-w-lg w-full">
        <h2 className="text-lg font-semibold mb-4">Share Report</h2>

        {/* Create New Link */}
        <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-2">Generate a shareable link</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-400">Expires in:</span>
            <select
              value={expiryDays ?? "never"}
              onChange={(e) =>
                setExpiryDays(e.target.value === "never" ? null : parseInt(e.target.value))
              }
              className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 text-sm focus:outline-none"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="never">Never</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Generate Link"}
          </button>
        </div>

        {/* Active Tokens */}
        <div className="mb-4">
          <div className="text-sm text-zinc-400 mb-2">
            Active Links ({tokens.length})
          </div>
          {loading ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : tokens.length === 0 ? (
            <div className="text-sm text-zinc-500">No active share links</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-zinc-300 font-mono truncate">
                      ...{t.token.slice(-12)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {t.accessCount} view{t.accessCount !== 1 ? "s" : ""}
                      {t.expiresAt &&
                        ` · Expires ${new Date(t.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => copyLink(t.url)}
                      className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRevoke(t.id)}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-lg hover:border-red-700 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-zinc-700 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
