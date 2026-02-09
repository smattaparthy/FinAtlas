"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";
import type { Modification } from "@/lib/modifications/types";
import type { ScenarioData } from "@/lib/modifications/apply";
import { applyModifications } from "@/lib/modifications/apply";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  modification?: Modification | string;
  pendingModification?: Modification;
}

interface ChatState {
  messages: ChatMessage[];
  modifications: Modification[];
  baselineData: ScenarioData | null;
  modifiedData: ScenarioData | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  scenarioId: string | null;
  conversationId: string | null;
}

type ChatAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_STREAMING"; streaming: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "LOAD_BASELINE"; data: ScenarioData; scenarioId: string }
  | { type: "ADD_USER_MESSAGE"; message: string }
  | { type: "START_ASSISTANT_MESSAGE" }
  | { type: "STREAM_DELTA"; text: string }
  | { type: "COMPLETE_ASSISTANT_MESSAGE"; message: string; pendingModification?: Modification }
  | { type: "ADD_ASSISTANT_MESSAGE"; message: string; pendingModification?: Modification }
  | { type: "CONFIRM_MODIFICATION"; modificationId: string }
  | { type: "REJECT_MODIFICATION"; modificationId: string }
  | { type: "UNDO_MODIFICATION" }
  | { type: "RESET_CONVERSATION" }
  | { type: "LOAD_CONVERSATION"; conversationId: string; messages: ChatMessage[] }
  | { type: "SET_CONVERSATION_ID"; conversationId: string | null };

const initialState: ChatState = {
  messages: [],
  modifications: [],
  baselineData: null,
  modifiedData: null,
  isLoading: false,
  isStreaming: false,
  error: null,
  scenarioId: null,
  conversationId: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };

    case "SET_STREAMING":
      return { ...state, isStreaming: action.streaming };

    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false, isStreaming: false };

    case "LOAD_BASELINE":
      return {
        ...state,
        baselineData: action.data,
        modifiedData: action.data,
        scenarioId: action.scenarioId,
        isLoading: false,
      };

    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg-${Date.now()}`,
            role: "user",
            content: action.message,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    case "START_ASSISTANT_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
          },
        ],
        isStreaming: true,
      };

    case "STREAM_DELTA": {
      const lastMessageIndex = state.messages.length - 1;
      if (lastMessageIndex < 0) return state;

      const updatedMessages = [...state.messages];
      updatedMessages[lastMessageIndex] = {
        ...updatedMessages[lastMessageIndex],
        content: updatedMessages[lastMessageIndex].content + action.text,
      };

      return {
        ...state,
        messages: updatedMessages,
      };
    }

    case "COMPLETE_ASSISTANT_MESSAGE": {
      const lastMessageIndex = state.messages.length - 1;
      if (lastMessageIndex < 0) return state;

      const updatedMessages = [...state.messages];
      updatedMessages[lastMessageIndex] = {
        ...updatedMessages[lastMessageIndex],
        content: action.message,
        pendingModification: action.pendingModification,
      };

      return {
        ...state,
        messages: updatedMessages,
        isLoading: false,
        isStreaming: false,
      };
    }

    case "ADD_ASSISTANT_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: action.message,
            timestamp: new Date().toISOString(),
            pendingModification: action.pendingModification,
          },
        ],
        isLoading: false,
      };

    case "CONFIRM_MODIFICATION": {
      const lastMessage = state.messages[state.messages.length - 1];
      if (!lastMessage?.pendingModification) return state;

      const newModifications = [...state.modifications, lastMessage.pendingModification];
      const modifiedData = state.baselineData
        ? applyModifications(state.baselineData, newModifications)
        : null;

      return {
        ...state,
        modifications: newModifications,
        modifiedData,
        messages: state.messages.map((msg, idx) =>
          idx === state.messages.length - 1
            ? { ...msg, modification: msg.pendingModification, pendingModification: undefined }
            : msg
        ),
      };
    }

    case "REJECT_MODIFICATION":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.modificationId
            ? { ...msg, pendingModification: undefined }
            : msg
        ),
      };

    case "UNDO_MODIFICATION": {
      if (state.modifications.length === 0) return state;

      const newModifications = state.modifications.slice(0, -1);
      const modifiedData = state.baselineData
        ? applyModifications(state.baselineData, newModifications)
        : null;

      return {
        ...state,
        modifications: newModifications,
        modifiedData,
      };
    }

    case "RESET_CONVERSATION":
      return {
        ...state,
        messages: [],
        modifications: [],
        modifiedData: state.baselineData,
        conversationId: null,
      };

    case "LOAD_CONVERSATION": {
      // Parse modifications from messages
      const modifications: Modification[] = [];
      const messages = action.messages.map((msg) => {
        if (msg.modification) {
          try {
            const mod = typeof msg.modification === 'string'
              ? JSON.parse(msg.modification) as Modification
              : msg.modification;
            modifications.push(mod);
            return { ...msg, modification: mod, pendingModification: undefined };
          } catch {
            return msg;
          }
        }
        return msg;
      });

      const modifiedData = state.baselineData
        ? applyModifications(state.baselineData, modifications)
        : null;

      return {
        ...state,
        conversationId: action.conversationId,
        messages,
        modifications,
        modifiedData,
      };
    }

    case "SET_CONVERSATION_ID":
      return {
        ...state,
        conversationId: action.conversationId,
      };

    default:
      return state;
  }
}

interface ChatContextValue {
  state: ChatState;
  sendMessage: (message: string) => Promise<void>;
  confirmModification: () => void;
  rejectModification: (messageId: string) => void;
  undoLastModification: () => void;
  resetConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  scenarioId,
}: {
  children: React.ReactNode;
  scenarioId: string;
}) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load baseline data on mount
  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: "SET_LOADING", loading: true });
        const response = await fetch(`/api/scenarios/${scenarioId}/data`);
        if (!response.ok) throw new Error("Failed to load scenario data");

        const data = await response.json();
        dispatch({
          type: "LOAD_BASELINE",
          data: {
            incomes: data.incomes,
            expenses: data.expenses,
            accounts: data.accounts,
            loans: data.loans,
            goals: data.goals,
          },
          scenarioId,
        });
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "Failed to load data",
        });
      }
    }

    loadData();
  }, [scenarioId]);

  const sendMessage = async (message: string) => {
    if (!state.baselineData) return;

    try {
      // Create conversation if this is the first message
      let currentConversationId = state.conversationId;
      if (!currentConversationId) {
        const title = message.length > 50 ? `${message.slice(0, 50)}...` : message;
        const createResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId, title }),
        });

        if (!createResponse.ok) throw new Error("Failed to create conversation");

        const { conversation } = await createResponse.json();
        currentConversationId = conversation.id;
        dispatch({ type: "SET_CONVERSATION_ID", conversationId: currentConversationId });
      }

      dispatch({ type: "ADD_USER_MESSAGE", message });

      // Save user message to database
      await fetch(`/api/conversations/${currentConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: message,
        }),
      });

      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "START_ASSISTANT_MESSAGE" });

      const conversationHistory = state.messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          scenarioData: state.modifiedData,
          modifications: state.modifications,
          conversationHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      if (!response.body) throw new Error("Response body is null");

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantMessage = "";
      let assistantModification: Modification | undefined;

      dispatch({ type: "SET_LOADING", loading: false });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "delta") {
              dispatch({ type: "STREAM_DELTA", text: data.text });
            } else if (data.type === "done") {
              assistantMessage = data.text;
              assistantModification = data.modification;
              dispatch({
                type: "COMPLETE_ASSISTANT_MESSAGE",
                message: data.text,
                pendingModification: data.modification,
              });
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE line:", line, parseError);
          }
        }
      }

      // Save assistant message to database
      if (assistantMessage && currentConversationId) {
        await fetch(`/api/conversations/${currentConversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: assistantMessage,
            modification: assistantModification ? JSON.stringify(assistantModification) : null,
          }),
        });
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Failed to send message",
      });
    }
  };

  const confirmModification = () => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.pendingModification) {
      dispatch({ type: "CONFIRM_MODIFICATION", modificationId: lastMessage.id });
    }
  };

  const rejectModification = (messageId: string) => {
    dispatch({ type: "REJECT_MODIFICATION", modificationId: messageId });
  };

  const undoLastModification = () => {
    dispatch({ type: "UNDO_MODIFICATION" });
  };

  const resetConversation = () => {
    dispatch({ type: "RESET_CONVERSATION" });
  };

  const loadConversation = async (id: string) => {
    try {
      dispatch({ type: "SET_LOADING", loading: true });
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) throw new Error("Failed to load conversation");

      const { conversation } = await response.json();

      const messages: ChatMessage[] = conversation.messages.map((msg: {
        id: string;
        role: string;
        content: string;
        modification: string | null;
        createdAt: string;
      }) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: msg.createdAt,
        modification: msg.modification,
      }));

      dispatch({
        type: "LOAD_CONVERSATION",
        conversationId: id,
        messages,
      });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Failed to load conversation",
      });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  const startNewConversation = () => {
    dispatch({ type: "RESET_CONVERSATION" });
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        sendMessage,
        confirmModification,
        rejectModification,
        undoLastModification,
        resetConversation,
        loadConversation,
        startNewConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
