"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 mx-auto bg-zinc-900 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3v18h18M6 15l3-3 3 3 3-3 3 3"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-50">
            You're offline
          </h1>
          <p className="text-zinc-400">
            Check your internet connection and try again.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="
            px-6 py-2.5 rounded-xl text-sm font-medium
            bg-emerald-400 text-zinc-950
            hover:bg-emerald-500
            transition-colors duration-150
          "
        >
          Try again
        </button>
      </div>
    </div>
  );
}
