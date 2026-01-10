"use client";

import { ChatProvider } from "@/contexts/ChatContext";
import ChatPanel from "./ChatPanel";
import ProjectionPanel from "./ProjectionPanel";

export default function AssistantClient({ scenarioId }: { scenarioId: string }) {
  return (
    <ChatProvider scenarioId={scenarioId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">AI Financial Assistant</h1>
          <p className="text-zinc-400 mt-1">Explore what-if scenarios for your financial future</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChatPanel />
          <ProjectionPanel />
        </div>
      </div>
    </ChatProvider>
  );
}
