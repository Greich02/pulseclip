import { prisma } from "./prisma";

// Approximate published rates, used only to estimate per-video cost for the
// Usage table (§7: "le coût d'analyse doit être suivi et loggé"). Update
// these constants as pricing changes — they're not billed to the user in
// the MVP, just logged for future billing-model design.
const DEEPGRAM_USD_PER_SECOND = 0.0000717; // nova-2 prerecorded, ~$0.0043/min ballpark
const ANTHROPIC_USD_PER_INPUT_TOKEN = 0.000003; // Sonnet-class input rate
const ANTHROPIC_USD_PER_OUTPUT_TOKEN = 0.000015; // Sonnet-class output rate

export async function logDeepgramUsage(videoId: string, audioSeconds: number) {
  await prisma.usage.create({
    data: {
      videoId,
      service: "deepgram",
      quantity: audioSeconds,
      costUsd: (audioSeconds * DEEPGRAM_USD_PER_SECOND).toFixed(4),
    },
  });
}

export async function logAnthropicUsage(videoId: string, inputTokens: number, outputTokens: number) {
  const cost = inputTokens * ANTHROPIC_USD_PER_INPUT_TOKEN + outputTokens * ANTHROPIC_USD_PER_OUTPUT_TOKEN;
  await prisma.usage.create({
    data: {
      videoId,
      service: "anthropic",
      quantity: inputTokens + outputTokens,
      costUsd: cost.toFixed(4),
    },
  });
}
