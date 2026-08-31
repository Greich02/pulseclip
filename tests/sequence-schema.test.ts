import { describe, it, expect } from "vitest";
import { sequenceDetectionResponseSchema } from "@/lib/sequence-schema";

function makeSequence(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    startMs: 252000,
    endMs: 278000,
    justification: "Rire franc suivi d'une révélation inattendue.",
    scoreSignals: {
      voiceIntensity: 92,
      emotionalWordDensity: 70,
      laughterOrSilence: 95,
      narrativeCoherence: 88,
    },
    onScreenText: [{ text: "J'y CROIS PAS...", appearAtMs: 300, emphasisWord: "CROIS" }],
    subtitleCues: [{ startMs: 0, endMs: 1800, text: "J'y crois pas", highlightWords: ["crois"] }],
    soundDesign: [{ atMs: 800, category: "riser", description: "Riser 0.8s avant le pic" }],
    musicSuggestion: "Ambiance tendue, montée synth",
    ...overrides,
  };
}

describe("sequenceDetectionResponseSchema", () => {
  it("parses a well-formed Claude response with 5 sequences", () => {
    const payload = { sequences: Array.from({ length: 5 }, () => makeSequence()) };
    const result = sequenceDetectionResponseSchema.parse(payload);
    expect(result.sequences).toHaveLength(5);
  });

  it("rejects fewer than 5 sequences", () => {
    const payload = { sequences: Array.from({ length: 3 }, () => makeSequence()) };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });

  it("rejects more than 15 sequences", () => {
    const payload = { sequences: Array.from({ length: 16 }, () => makeSequence()) };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });

  it("rejects a sequence whose endMs is before startMs", () => {
    const payload = { sequences: Array.from({ length: 5 }, () => makeSequence({ startMs: 1000, endMs: 500 })) };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });

  it("rejects a sequence missing sound design suggestions", () => {
    const payload = { sequences: Array.from({ length: 5 }, () => makeSequence({ soundDesign: [] })) };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });

  it("rejects an unknown sound design category", () => {
    const payload = {
      sequences: Array.from({ length: 5 }, () =>
        makeSequence({ soundDesign: [{ atMs: 0, category: "explosion", description: "boom" }] })
      ),
    };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });

  it("rejects score signals outside the 0-100 range", () => {
    const payload = {
      sequences: Array.from({ length: 5 }, () =>
        makeSequence({ scoreSignals: { voiceIntensity: 150, emotionalWordDensity: 50, laughterOrSilence: 50, narrativeCoherence: 50 } })
      ),
    };
    expect(() => sequenceDetectionResponseSchema.parse(payload)).toThrow();
  });
});
