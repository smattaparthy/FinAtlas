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
  modification?: Modification;
  pendingModification?: Modification;
}

interface ChatState {
  messages: ChatMessage[];
  modifications: Modification[];
  baselineData: ScenarioData | null;
  modifiedData: ScenarioData | null;
  isLoading: boolean;
  error: string | null;
  scenarioId: string | null;
}

type ChatAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "LOAD_BASELINE"; data: ScenarioData; scenarioId: string }
  | { type: "ADD_USER_MESSAGE"; message: string }
  | { type: "ADD_ASSISTANT_MESSAGE"; message: string; pendingModification?: Modification }
  | { type: "CONFIRM_MODIFICATION"; modificationId: string }
  | { type: "REJECT_MODIFICATION"; modificationId: string }
  | { type: "UNDO_MODIFICATION" }
  | { type: "RESET_CONVERSATION" };

const initialState: ChatState = {
  messages: [],
  modifications: [],
  baselineData: null,
  modifiedData: null,
  isLoading: false,
  error: null,
  scenarioId: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };

    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false };

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
      dispatch({ type: "ADD_USER_MESSAGE", message });
      dispatch({ type: "SET_LOADING", loading: true });

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

      const data = await response.json();
      dispatch({
        type: "ADD_ASSISTANT_MESSAGE",
        message: data.message,
        pendingModification: data.modification,
      });
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

  return (
    <ChatContext.Provider
      value={{
        state,
        sendMessage,
        confirmModification,
        rejectModification,
        undoLastModification,
        resetConversation,
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
