import type { ScoreSignals } from "./sequence-schema";

// F-03: composite viral score (0-100) from the 4 signals Claude reports per
// sequence: relative voice intensity, emotional-word density, laughter/
// dramatic-silence presence, and narrative self-containedness.
//
// Weights favor the two signals hardest to fake (intensity, coherence)
// while still rewarding laughs/silences and emotional vocabulary — kept as
// a pure function so it's independently unit-testable and swappable without
// touching the pipeline orchestration.
const WEIGHTS = {
  voiceIntensity: 0.3,
  emotionalWordDensity: 0.2,
  laughterOrSilence: 0.2,
  narrativeCoherence: 0.3,
} as const;

export function computeViralScore(signals: ScoreSignals): number {
  for (const [key, value] of Object.entries(signals)) {
    if (value < 0 || value > 100 || Number.isNaN(value)) {
      throw new Error(`Invalid score signal "${key}": ${value} (expected 0-100)`);
    }
  }

  const weighted =
    signals.voiceIntensity * WEIGHTS.voiceIntensity +
    signals.emotionalWordDensity * WEIGHTS.emotionalWordDensity +
    signals.laughterOrSilence * WEIGHTS.laughterOrSilence +
    signals.narrativeCoherence * WEIGHTS.narrativeCoherence;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}

/** Design system rule (§5.3): scores >80 get the "high" coral treatment. */
export function scoreTier(score: number): "high" | "mid" {
  return score > 80 ? "high" : "mid";
}
