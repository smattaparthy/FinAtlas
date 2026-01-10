import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { sendMessage } from "@/lib/ai/claude-client";
import { buildSystemPrompt, parseModificationFromResponse } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, scenarioData, modifications = [], conversationHistory = [] } = body;

    if (!message || !scenarioData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build system prompt with current context
    const systemPrompt = buildSystemPrompt(scenarioData, modifications);

    // Send to Claude
    const aiResponse = await sendMessage(systemPrompt, message, conversationHistory);

    // Parse modification if present
    const modification = parseModificationFromResponse(aiResponse);

    return NextResponse.json({
      message: aiResponse,
      modification: modification ? { ...modification, id: `mod-${Date.now()}`, appliedAt: new Date().toISOString() } : null,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
