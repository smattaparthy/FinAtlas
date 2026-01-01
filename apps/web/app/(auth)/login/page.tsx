"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@local");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-xl">
        <h1 className="text-xl font-semibold">FinAtlas</h1>
        <p className="text-sm text-zinc-400 mt-1">Local-only financial planning</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 py-2 font-medium disabled:opacity-60 hover:bg-zinc-200 transition-colors"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-xs text-zinc-500">
            Demo: <span className="text-zinc-300">demo@local / Demo1234!</span>
          </div>
        </form>
      </div>
    </div>
  );
}
