import type { SequenceCandidate } from "./sequence-schema";

type SubtitleCue = SequenceCandidate["subtitleCues"][number];

function msToSrtTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/**
 * Wraps highlight keywords in an SRT-safe <b> tag (widely supported by
 * editing tools) so exported subtitles carry the "highlight" styling from
 * the design spec (§5.3 subtitle_style, keyword uppercase + highlight color
 * is applied by the consuming editor / burn-in step, not baked into the .srt
 * text itself — the file only marks *which* words are keywords).
 */
function applyHighlights(text: string, highlightWords: string[]): string {
  if (highlightWords.length === 0) return text;
  let result = text;
  for (const word of highlightWords) {
    if (!word) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b(${escaped})\\b`, "gi");
    result = result.replace(pattern, "<b>$1</b>");
  }
  return result;
}

/**
 * F-05: generates a .srt file for one exported sequence from its
 * Claude-produced subtitle cues. Cue timestamps are relative to the
 * sequence start (ms) — matching what's stored on the Sequence row.
 */
export function generateSrt(cues: SubtitleCue[]): string {
  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);

  return sorted
    .map((cue, index) => {
      const start = msToSrtTimestamp(cue.startMs);
      const end = msToSrtTimestamp(cue.endMs);
      const text = applyHighlights(cue.text, cue.highlightWords ?? []);
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
}
