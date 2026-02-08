"use client";

import { useState } from "react";

export function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setConfirmText("");
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;

    setDeleting(true);

    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (response.ok) {
        // Hard redirect to clear all client state
        window.location.href = "/login";
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch (error) {
      alert("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 overflow-hidden">
        <div className="p-6 border-b border-red-900/50">
          <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
          <p className="text-sm text-red-400/70 mt-1">Irreversible actions</p>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-zinc-100">Delete Account</p>
              <p className="text-sm text-zinc-500 mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button
              onClick={openModal}
              className="px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={closeModal}
          />
          <div className="relative rounded-2xl border border-red-900/50 bg-zinc-950 p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-red-400">
              Delete Account
            </h3>
            <p className="text-sm text-zinc-400 mt-2">
              This action is{" "}
              <span className="text-red-400 font-medium">
                permanent and irreversible
              </span>
              . All your data including households, scenarios, income, expenses,
              investments, and loans will be permanently deleted.
            </p>
            <p className="text-sm text-zinc-400 mt-4">
              Type{" "}
              <span className="font-mono text-red-400 font-medium">DELETE</span>{" "}
              to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {deleting ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
