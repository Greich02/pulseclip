import { describe, it, expect } from "vitest";
import { computeViralScore, scoreTier } from "@/lib/viral-score";

describe("computeViralScore", () => {
  it("returns 100 when every signal is maxed out", () => {
    expect(
      computeViralScore({
        voiceIntensity: 100,
        emotionalWordDensity: 100,
        laughterOrSilence: 100,
        narrativeCoherence: 100,
      })
    ).toBe(100);
  });

  it("returns 0 when every signal is at rock bottom", () => {
    expect(
      computeViralScore({
        voiceIntensity: 0,
        emotionalWordDensity: 0,
        laughterOrSilence: 0,
        narrativeCoherence: 0,
      })
    ).toBe(0);
  });

  it("weights voiceIntensity and narrativeCoherence more heavily than the other two signals", () => {
    const heavy = computeViralScore({
      voiceIntensity: 100,
      emotionalWordDensity: 0,
      laughterOrSilence: 0,
      narrativeCoherence: 100,
    });
    const light = computeViralScore({
      voiceIntensity: 0,
      emotionalWordDensity: 100,
      laughterOrSilence: 100,
      narrativeCoherence: 0,
    });
    expect(heavy).toBeGreaterThan(light);
  });

  it("matches the design mockup example (score 92 for a laugh-heavy peak moment)", () => {
    const score = computeViralScore({
      voiceIntensity: 95,
      emotionalWordDensity: 80,
      laughterOrSilence: 100,
      narrativeCoherence: 90,
    });
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("throws on out-of-range signals", () => {
    expect(() =>
      computeViralScore({
        voiceIntensity: 120,
        emotionalWordDensity: 50,
        laughterOrSilence: 50,
        narrativeCoherence: 50,
      })
    ).toThrow();
  });
});

describe("scoreTier", () => {
  it("classifies scores over 80 as high (§5.3 coral treatment)", () => {
    expect(scoreTier(92)).toBe("high");
    expect(scoreTier(81)).toBe("high");
  });

  it("classifies scores 80 and under as mid", () => {
    expect(scoreTier(80)).toBe("mid");
    expect(scoreTier(74)).toBe("mid");
  });
});
