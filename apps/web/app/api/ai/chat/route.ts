import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnthropicClient } from "@/lib/ai/claude-client";
import { buildSystemPrompt, parseModificationFromResponse } from "@/lib/ai/prompts";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import type { ScenarioData } from "@/lib/modifications/apply";
import type { Modification } from "@/lib/modifications/types";
import { financialTools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/toolHandlers";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

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

    // Get scenario ID from the first account, income, expense, or loan (they all have scenarioId)
    const scenarioId =
      (data.scenarioData as any).accounts?.[0]?.scenarioId ||
      (data.scenarioData as any).incomes?.[0]?.scenarioId ||
      (data.scenarioData as any).expenses?.[0]?.scenarioId ||
      (data.scenarioData as any).loans?.[0]?.scenarioId ||
      '';

    // Multi-turn conversation with tool use
    const messages: MessageParam[] = [
      ...data.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: data.message,
      },
    ];

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = messages;
          let toolUseLoopCount = 0;
          const maxToolUseLoops = 5; // Prevent infinite loops
          let collectedModification: any = null;

          // Tool use loop: keep calling Claude until it responds with text only
          while (toolUseLoopCount < maxToolUseLoops) {
            toolUseLoopCount++;

            const stream = getAnthropicClient().messages.stream({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 4096,
              system: systemPrompt,
              messages: currentMessages,
              tools: financialTools,
            });

            // Stream text deltas as they arrive
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                const payload = JSON.stringify({ type: "delta", text: event.delta.text });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }

            // Get final message
            const finalMessage = await stream.finalMessage();

            // Check if Claude wants to use tools
            const toolUseBlocks = finalMessage.content.filter(block => block.type === "tool_use");

            if (toolUseBlocks.length === 0) {
              // No tool use - we're done, return the final text response
              const textContent = finalMessage.content.find((block) => block.type === "text");
              const fullText = textContent && "text" in textContent ? textContent.text : "";

              // Try to parse modification from text (fallback for old JSON-in-text format)
              const textModification = parseModificationFromResponse(fullText);

              // Use tool modification if available, otherwise fallback to text modification
              const modification = collectedModification || textModification;

              const finalPayload = JSON.stringify({
                type: "done",
                text: fullText,
                modification: modification ? { ...modification, id: `mod-${Date.now()}`, appliedAt: new Date().toISOString() } : null,
              });
              controller.enqueue(encoder.encode(`data: ${finalPayload}\n\n`));
              controller.close();
              return;
            }

            // Check if modify_scenario was called and collect it
            for (const block of toolUseBlocks) {
              if (block.type === "tool_use" && block.name === "modify_scenario") {
                collectedModification = block.input;
              }
            }

            // Execute tool calls
            const toolResults = await Promise.all(
              toolUseBlocks.map(async (block) => {
                if (block.type !== "tool_use") return null;

                const toolResult = await handleToolCall(
                  block.name,
                  block.input as Record<string, unknown>,
                  scenarioId,
                  user.id
                );

                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: toolResult,
                };
              })
            );

            // Add assistant message with tool_use and tool results to conversation
            currentMessages = [
              ...currentMessages,
              {
                role: "assistant" as const,
                content: finalMessage.content,
              },
              {
                role: "user" as const,
                content: toolResults.filter((r): r is NonNullable<typeof r> => r !== null),
              },
            ];
          }

          // If we hit max loops, return error
          const errorPayload = JSON.stringify({
            type: "error",
            error: "Too many tool use iterations",
          });
          controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorPayload = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Stream failed",
          });
          controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
