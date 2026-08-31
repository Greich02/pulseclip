import Anthropic from "@anthropic-ai/sdk";
import { sequenceDetectionToolSchema, sequenceDetectionResponseSchema, type SequenceDetectionResponse } from "./sequence-schema";
import type { TranscriptWord, ProsodyMarkers } from "./deepgram";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing required env var ANTHROPIC_API_KEY. See .env.example.");
  _client = new Anthropic({ apiKey });
  return _client;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

function buildPrompt(params: {
  videoTitle: string;
  durationSeconds: number;
  words: TranscriptWord[];
  prosody: ProsodyMarkers;
  minSequenceScore: number;
  durationRangeSec: { min: number; max: number };
}): string {
  const transcriptText = params.words
    .map((w) => `[${(w.startMs / 1000).toFixed(2)}s] ${w.text}`)
    .join(" ");

  return `You are an expert short-form video editor. Analyze this transcript from "${params.videoTitle}" (${params.durationSeconds}s total) and identify the 5 to 15 strongest candidate sequences for viral short clips (TikTok/Reels/Shorts style).

Each sequence must:
- Last between ${params.durationRangeSec.min} and ${params.durationRangeSec.max} seconds.
- Have a clear beginning and end that is understandable without the rest of the video (narrative self-containedness).
- Be evaluated on 4 signals (0-100 each): voiceIntensity (relative vocal energy/pace vs. the rest of the video), emotionalWordDensity (charged/emotional vocabulary density), laughterOrSilence (presence of laughter or a dramatic pause), narrativeCoherence (stands alone as a mini-story).

Detected prosodic markers to ground your analysis (silences over 800ms and relative intensity peaks):
${JSON.stringify(params.prosody, null, 2)}

Word-level transcript with timestamps:
${transcriptText}

For every sequence, also produce a full editing recommendation pack: on-screen hook text with millisecond timing, subtitle cues with keyword highlights, timestamped sound-design suggestions (riser/whoosh/impact/silence), and a background-music mood suggestion. Only report sequences you'd genuinely recommend — do not pad the list below a quality bar of roughly ${params.minSequenceScore}/100 composite score unless fewer than 5 strong candidates exist.

Call the report_sequences tool with your findings.`;
}

/**
 * F-02/F-04: single structured Claude call that both detects candidate
 * sequences and generates their full recommendation pack, using tool-use
 * to force a strict JSON shape (§8.3 "prompt Claude structuré").
 */
export async function detectSequences(params: {
  videoTitle: string;
  durationSeconds: number;
  words: TranscriptWord[];
  prosody: ProsodyMarkers;
  minSequenceScore: number;
  durationRangeSec: { min: number; max: number };
}): Promise<{ result: SequenceDetectionResponse; inputTokens: number; outputTokens: number }> {
  const prompt = buildPrompt(params);

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 8192,
    tools: [sequenceDetectionToolSchema],
    tool_choice: { type: "tool", name: sequenceDetectionToolSchema.name },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block for report_sequences");
  }

  const parsed = sequenceDetectionResponseSchema.parse(toolUse.input);

  return {
    result: parsed,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
