import { describe, it, expect } from "vitest";
import { deriveProsody, type Transcript } from "@/lib/deepgram";
import { computeViralScore } from "@/lib/viral-score";
import { generateSrt } from "@/lib/srt";
import { sequenceDetectionResponseSchema } from "@/lib/sequence-schema";

/**
 * §9.2 integration test: exercises the same data pipeline the
 * `analyze-video` Inngest function composes (transcript → prosody →
 * Claude-shaped structured output → viral score → persisted sequence
 * fields), using a mocked transcript and a mocked Claude tool-use response
 * instead of live Deepgram/Anthropic calls.
 *
 * A true end-to-end run against real services + a live Postgres instance is
 * documented in the README (`npm run dev` + `npm run dev:inngest` with real
 * .env values) — that's outside what a sandboxed unit-test run can cover.
 */
describe("analyze-video pipeline (mocked services)", () => {
  const mockTranscript: Transcript = {
    fullText: "Alors la je vais vous raconter un truc de fou ... [pause] ... personne ne s'y attendait",
    words: [
      { text: "Alors", startMs: 0, endMs: 200, intensity: 0.4 },
      { text: "la", startMs: 200, endMs: 350, intensity: 0.4 },
      { text: "je", startMs: 350, endMs: 450, intensity: 0.4 },
      { text: "vais", startMs: 450, endMs: 600, intensity: 0.4 },
      { text: "vous", startMs: 600, endMs: 750, intensity: 0.4 },
      { text: "raconter", startMs: 750, endMs: 1100, intensity: 0.4 },
      { text: "un", startMs: 1100, endMs: 1200, intensity: 0.4 },
      { text: "truc", startMs: 1200, endMs: 1400, intensity: 0.9 },
      { text: "de", startMs: 1400, endMs: 1500, intensity: 0.9 },
      { text: "fou", startMs: 1500, endMs: 1700, intensity: 0.95 },
      // dramatic pause > 800ms
      { text: "personne", startMs: 2700, endMs: 3000, intensity: 0.6 },
      { text: "ne", startMs: 3000, endMs: 3100, intensity: 0.6 },
      { text: "s'y", startMs: 3100, endMs: 3250, intensity: 0.6 },
      { text: "attendait", startMs: 3250, endMs: 3600, intensity: 0.6 },
    ],
  };

  it("derives silences (>800ms) and intensity peaks from the transcript", () => {
    const prosody = deriveProsody(mockTranscript);

    expect(prosody.silences).toHaveLength(1);
    expect(prosody.silences[0].durationMs).toBe(1000); // gap between 1700 and 2700

    expect(prosody.intensityPeaks.length).toBeGreaterThan(0);
    expect(prosody.intensityPeaks.some((p) => p.atMs === 1500)).toBe(true);
  });

  it("validates a mocked Claude structured response and computes viral scores end-to-end", () => {
    // Shape mirrors exactly what lib/anthropic.ts expects back from the
    // report_sequences tool call.
    const mockClaudeResponse = {
      sequences: Array.from({ length: 5 }, (_, i) => ({
        startMs: i * 60_000,
        endMs: i * 60_000 + 30_000,
        justification: "Moment fort avec pic d'intensité et silence dramatique.",
        scoreSignals: {
          voiceIntensity: 90,
          emotionalWordDensity: 65,
          laughterOrSilence: 88,
          narrativeCoherence: 80,
        },
        onScreenText: [{ text: "J'y CROIS PAS", appearAtMs: 300, emphasisWord: "CROIS" }],
        subtitleCues: [{ startMs: 0, endMs: 1700, text: "un truc de fou", highlightWords: ["fou"] }],
        soundDesign: [{ atMs: 800, category: "riser", description: "Riser 0.8s avant le pic" }],
        musicSuggestion: "Ambiance tendue, montée synth",
      })),
    };

    const parsed = sequenceDetectionResponseSchema.parse(mockClaudeResponse);
    expect(parsed.sequences).toHaveLength(5);

    // Mirrors the "persist-sequences" step in inngest/functions/analyze-video.ts
    const persisted = parsed.sequences.map((seq) => ({
      startMs: seq.startMs,
      endMs: seq.endMs,
      viralScore: computeViralScore(seq.scoreSignals),
    }));

    for (const seq of persisted) {
      expect(seq.viralScore).toBeGreaterThanOrEqual(0);
      expect(seq.viralScore).toBeLessThanOrEqual(100);
      expect(seq.endMs).toBeGreaterThan(seq.startMs);
    }

    // Mirrors the "generate-and-upload-srt" step in inngest/functions/export-sequence.ts
    const srt = generateSrt(parsed.sequences[0].subtitleCues);
    expect(srt).toContain("<b>fou</b>");
  });
});
