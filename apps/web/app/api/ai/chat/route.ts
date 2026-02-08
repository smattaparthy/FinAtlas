import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { sendMessage } from "@/lib/ai/claude-client";
import { buildSystemPrompt, parseModificationFromResponse } from "@/lib/ai/prompts";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import type { ScenarioData } from "@/lib/modifications/apply";
import type { Modification } from "@/lib/modifications/types";

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  scenarioData: z.record(z.unknown()).nullable().optional(),
  modifications: z.array(z.record(z.unknown())).optional().default([]),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`ai-chat:${user.id}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!data.scenarioData) {
      return NextResponse.json(
        { error: "scenarioData is required" },
        { status: 400 }
      );
    }

    // Build system prompt with current context
    const systemPrompt = buildSystemPrompt(data.scenarioData as unknown as ScenarioData, data.modifications as unknown as Modification[]);

    // Send to Claude
    const aiResponse = await sendMessage(systemPrompt, data.message, data.conversationHistory);

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
