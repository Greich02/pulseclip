import { z } from "zod";

// Strict schema for Claude's structured output (§8.3 "prompt Claude structuré").
// Used both to build the tool_use JSON schema sent to the API and to
// validate/parse the response before it's persisted.

export const scoreSignalsSchema = z.object({
  voiceIntensity: z.number().min(0).max(100),
  emotionalWordDensity: z.number().min(0).max(100),
  laughterOrSilence: z.number().min(0).max(100),
  narrativeCoherence: z.number().min(0).max(100),
});

export const onScreenTextItemSchema = z.object({
  text: z.string().min(1),
  appearAtMs: z.number().int().min(0),
  emphasisWord: z.string().optional(),
});

export const subtitleCueSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string().min(1),
  highlightWords: z.array(z.string()).default([]),
});

export const soundDesignItemSchema = z.object({
  atMs: z.number().int().min(0),
  category: z.enum(["riser", "whoosh", "impact", "silence"]),
  description: z.string().min(1),
});

export const sequenceCandidateSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  justification: z.string().min(1),
  scoreSignals: scoreSignalsSchema,
  onScreenText: z.array(onScreenTextItemSchema).min(1),
  subtitleCues: z.array(subtitleCueSchema).min(1),
  soundDesign: z.array(soundDesignItemSchema).min(1),
  musicSuggestion: z.string().min(1),
}).refine((seq) => seq.endMs > seq.startMs, {
  message: "endMs must be after startMs",
});

export const sequenceDetectionResponseSchema = z.object({
  sequences: z.array(sequenceCandidateSchema).min(5).max(15),
});

export type SequenceCandidate = z.infer<typeof sequenceCandidateSchema>;
export type SequenceDetectionResponse = z.infer<typeof sequenceDetectionResponseSchema>;
export type ScoreSignals = z.infer<typeof scoreSignalsSchema>;

/**
 * JSON-Schema mirror of the Zod schema above, handed to Claude as a tool
 * definition so the model is constrained to return exactly this shape
 * (Anthropic tool-use structured output, per §8.3).
 */
export const sequenceDetectionToolSchema = {
  name: "report_sequences",
  description:
    "Report the 5 to 15 candidate viral sequences detected in the video transcript, each with a viral-score breakdown and a full editing recommendation pack.",
  input_schema: {
    type: "object",
    properties: {
      sequences: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            startMs: { type: "integer", minimum: 0, description: "Sequence start, milliseconds from video start" },
            endMs: { type: "integer", minimum: 0, description: "Sequence end, milliseconds from video start (20-90s duration)" },
            justification: { type: "string", description: "One short sentence on why this moment is compelling" },
            scoreSignals: {
              type: "object",
              properties: {
                voiceIntensity: { type: "number", minimum: 0, maximum: 100 },
                emotionalWordDensity: { type: "number", minimum: 0, maximum: 100 },
                laughterOrSilence: { type: "number", minimum: 0, maximum: 100 },
                narrativeCoherence: { type: "number", minimum: 0, maximum: 100 },
              },
              required: ["voiceIntensity", "emotionalWordDensity", "laughterOrSilence", "narrativeCoherence"],
            },
            onScreenText: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "Short on-screen hook text" },
                  appearAtMs: { type: "integer", minimum: 0, description: "Milliseconds relative to sequence start" },
                  emphasisWord: { type: "string" },
                },
                required: ["text", "appearAtMs"],
              },
            },
            subtitleCues: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  startMs: { type: "integer", minimum: 0 },
                  endMs: { type: "integer", minimum: 0 },
                  text: { type: "string" },
                  highlightWords: { type: "array", items: { type: "string" } },
                },
                required: ["startMs", "endMs", "text", "highlightWords"],
              },
            },
            soundDesign: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  atMs: { type: "integer", minimum: 0, description: "Milliseconds relative to sequence start" },
                  category: { type: "string", enum: ["riser", "whoosh", "impact", "silence"] },
                  description: { type: "string" },
                },
                required: ["atMs", "category", "description"],
              },
            },
            musicSuggestion: { type: "string", description: "Mood/genre description, no audio file" },
          },
          required: [
            "startMs",
            "endMs",
            "justification",
            "scoreSignals",
            "onScreenText",
            "subtitleCues",
            "soundDesign",
            "musicSuggestion",
          ],
        },
      },
    },
    required: ["sequences"],
  },
} as const;
