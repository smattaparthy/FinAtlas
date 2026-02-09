"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ content: string }>;
  _count: { messages: number };
}

interface ConversationListProps {
  scenarioId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export default function ConversationList({
  scenarioId,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [scenarioId]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations?scenarioId=${scenarioId}`);
      if (!response.ok) throw new Error("Failed to load conversations");

      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      setConversations((prev) => prev.filter((c) => c.id !== id));
      onDeleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const getPreview = (conversation: Conversation) => {
    if (conversation.messages.length === 0) return "No messages yet";
    const firstMessage = conversation.messages[0].content;
    return firstMessage.length > 60 ? `${firstMessage.slice(0, 60)}...` : firstMessage;
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Conversations</h2>
        <button
          onClick={onNewConversation}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="text-center text-zinc-500 py-8">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new one to get going</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                activeConversationId === conv.id
                  ? "border-emerald-500 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium text-sm text-zinc-100 line-clamp-1">{conv.title}</h3>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="flex-shrink-0 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2 mb-1">{getPreview(conv)}</p>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>{conv._count.messages} messages</span>
                <span>{formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
