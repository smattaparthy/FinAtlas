"use client";

import { useChat } from "@/contexts/ChatContext";
import { useState, useRef, useEffect, useMemo } from "react";
import { generateRecommendations } from "@/lib/assistant/promptRecommendations";

export default function ChatPanel() {
  const { state, sendMessage, confirmModification, rejectModification } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recommendations = useMemo(
    () => generateRecommendations(state.baselineData),
    [state.baselineData]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-[600px]">
      <h2 className="text-lg font-medium mb-4">Chat</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {state.messages.length === 0 && (
          <div className="py-6">
            <p className="text-center text-zinc-400 mb-1 text-sm font-medium">
              Ask me anything about your financial future
            </p>
            <p className="text-center text-zinc-500 text-xs mb-4">
              Click a suggestion or type your own question
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setInput(rec.prompt)}
                  className="text-left rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm cursor-pointer hover:border-emerald-500/50 hover:bg-zinc-800 transition-colors group"
                >
                  <span className="mr-2">{rec.icon}</span>
                  <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors">{rec.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {state.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Confirmation buttons for pending modifications */}
              {message.pendingModification && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={confirmModification}
                    className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    ✓ Confirm
                  </button>
                  <button
                    onClick={() => rejectModification(message.id)}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    ✗ Cancel
                  </button>
                </div>
              )}

              {/* Show if modification was applied */}
              {message.modification && (
                <div className="mt-2 text-xs text-green-400">✓ Applied</div>
              )}
            </div>
          </div>
        ))}

        {state.isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 rounded-lg px-4 py-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        {state.error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg px-4 py-2">
            {state.error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a what-if question..."
          className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-600"
          disabled={state.isLoading}
        />
        <button
          type="submit"
          disabled={state.isLoading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
