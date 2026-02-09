"use client";

import { ChatProvider, useChat } from "@/contexts/ChatContext";
import ChatPanel from "./ChatPanel";
import ProjectionPanel from "./ProjectionPanel";
import ConversationList from "./ConversationList";

function AssistantContent({ scenarioId }: { scenarioId: string }) {
  const { state, loadConversation, startNewConversation } = useChat();

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
  };

  const handleNewConversation = () => {
    startNewConversation();
  };

  const handleDeleteConversation = (id: string) => {
    // If deleted conversation was active, start a new one
    if (state.conversationId === id) {
      startNewConversation();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Financial Assistant</h1>
        <p className="text-zinc-400 mt-1">Explore what-if scenarios for your financial future</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <ConversationList
            scenarioId={scenarioId}
            activeConversationId={state.conversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
        <div className="lg:col-span-5">
          <ChatPanel />
        </div>
        <div className="lg:col-span-4">
          <ProjectionPanel />
        </div>
      </div>
    </div>
  );
}

export default function AssistantClient({ scenarioId }: { scenarioId: string }) {
  return (
    <ChatProvider scenarioId={scenarioId}>
      <AssistantContent scenarioId={scenarioId} />
    </ChatProvider>
  );
}
