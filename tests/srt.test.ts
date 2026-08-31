import { describe, it, expect } from "vitest";
import { generateSrt } from "@/lib/srt";

describe("generateSrt", () => {
  it("generates correctly numbered, timestamped cues", () => {
    const srt = generateSrt([
      { startMs: 0, endMs: 1500, text: "J'y crois pas", highlightWords: [] },
      { startMs: 1600, endMs: 3200, text: "Personne ne s'y attendait", highlightWords: [] },
    ]);

    expect(srt).toContain("1\n00:00:00,000 --> 00:00:01,500\nJ'y crois pas");
    expect(srt).toContain("2\n00:00:01,600 --> 00:00:03,200\nPersonne ne s'y attendait");
  });

  it("sorts cues by start time regardless of input order", () => {
    const srt = generateSrt([
      { startMs: 5000, endMs: 6000, text: "second", highlightWords: [] },
      { startMs: 0, endMs: 1000, text: "first", highlightWords: [] },
    ]);
    const firstIndex = srt.indexOf("first");
    const secondIndex = srt.indexOf("second");
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it("wraps highlighted keywords in <b> tags, case-insensitively, whole-word only", () => {
    const srt = generateSrt([
      { startMs: 0, endMs: 1000, text: "J'y CROIS pas du tout", highlightWords: ["crois"] },
    ]);
    expect(srt).toContain("<b>CROIS</b>");
  });

  it("handles hour-scale timestamps correctly", () => {
    const srt = generateSrt([{ startMs: 3_661_250, endMs: 3_662_000, text: "x", highlightWords: [] }]);
    expect(srt).toContain("01:01:01,250 --> 01:01:02,000");
  });
});
