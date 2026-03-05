import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/fairscale";
import type { FairScaleScore, ChatMessage } from "@/types/fairscale";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      scores,
      history,
    }: {
      message: string;
      scores: FairScaleScore[];
      history: ChatMessage[];
    } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(scores);

    // Build conversation history for Claude
    // Filter to only user/assistant turns, exclude score cards
    const conversationHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20) // Keep last 20 turns to stay within context limits
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ content });
  } catch (err) {
    console.error("[/api/chat]", err);

    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${err.message}` },
        { status: err.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
