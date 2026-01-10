import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

export const anthropic = new Anthropic({
  apiKey,
});

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  return textContent && "text" in textContent ? textContent.text : "";
}
