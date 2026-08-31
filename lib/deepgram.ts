import fs from "node:fs";

// STT provider for F-02 step 2. Swapped in for ElevenLabs (per the cahier
// des charges' original stack choice) while waiting on ElevenLabs API
// access — Deepgram's prerecorded transcription API gives the same
// word-level timestamps the pipeline needs. Swapping back later only means
// re-pointing the two imports in inngest/functions/analyze-video.ts and
// lib/anthropic.ts at a new lib/elevenlabs.ts — deriveProsody, the Zod
// sequence schema, and everything downstream (Claude call, viral score,
// SRT export) are provider-agnostic and untouched.
const DEEPGRAM_STT_ENDPOINT = "https://api.deepgram.com/v1/listen";

function apiKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("Missing required env var DEEPGRAM_API_KEY. See .env.example.");
  return key;
}

export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
  /** 0-1 word-recognition confidence, used as an intensity proxy (Deepgram
   * doesn't expose raw loudness/energy per word). */
  intensity?: number;
  isLaughter?: boolean;
}

export interface Transcript {
  words: TranscriptWord[];
  fullText: string;
}

export interface ProsodyMarkers {
  /** Gaps between words longer than 800ms (§4.1 F-02). */
  silences: Array<{ startMs: number; endMs: number; durationMs: number }>;
  /** Local peaks in relative vocal intensity. */
  intensityPeaks: Array<{ atMs: number; relativeIntensity: number }>;
  laughterMoments: Array<{ atMs: number }>;
}

// Filler/onomatopoeia patterns nova-2 occasionally transcribes literally —
// best-effort laughter heuristic since Deepgram doesn't tag audio events
// the way some STT providers do.
const LAUGHTER_PATTERN = /^(ha){2,}|^(rire|rires|\[rire\]|\(rires?\)|haha+|mdr)$/i;

/**
 * F-02 step 2: word-level transcription with timestamps via Deepgram's
 * prerecorded Speech-to-Text API (nova-2 model).
 */
export async function transcribeAudio(audioPath: string): Promise<Transcript> {
  const audioBuffer = await fs.promises.readFile(audioPath);

  const params = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
    detect_language: "true",
  });

  const res = await fetch(`${DEEPGRAM_STT_ENDPOINT}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": "audio/wav",
    },
    body: audioBuffer,
  });
  if (!res.ok) {
    throw new Error(`Deepgram STT request failed (${res.status}): ${await res.text()}`);
  }

  const raw = await res.json();
  const alternative = raw?.results?.channels?.[0]?.alternatives?.[0];
  const rawWords: any[] = alternative?.words ?? [];

  const words: TranscriptWord[] = rawWords.map((w) => {
    const text = w.punctuated_word ?? w.word ?? "";
    return {
      text,
      startMs: Math.round((w.start ?? 0) * 1000),
      endMs: Math.round((w.end ?? 0) * 1000),
      intensity: typeof w.confidence === "number" ? Math.min(1, Math.max(0, w.confidence)) : undefined,
      isLaughter: LAUGHTER_PATTERN.test(text.trim()),
    };
  });

  return { words, fullText: alternative?.transcript ?? words.map((w) => w.text).join(" ") };
}

const SILENCE_THRESHOLD_MS = 800;

/**
 * F-02 step 3: derive prosodic markers (silences, intensity peaks,
 * laughter) purely from the word-level transcript — no separate audio
 * analysis pass needed since the STT response already carries per-word
 * timing and a confidence score used as an intensity proxy.
 */
export function deriveProsody(transcript: Transcript): ProsodyMarkers {
  const { words } = transcript;
  const silences: ProsodyMarkers["silences"] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].startMs - words[i - 1].endMs;
    if (gap > SILENCE_THRESHOLD_MS) {
      silences.push({ startMs: words[i - 1].endMs, endMs: words[i].startMs, durationMs: gap });
    }
  }

  const intensities = words.filter((w) => typeof w.intensity === "number").map((w) => w.intensity as number);
  const avgIntensity = intensities.length > 0 ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0.5;

  const intensityPeaks: ProsodyMarkers["intensityPeaks"] = words
    .filter((w) => typeof w.intensity === "number" && (w.intensity as number) > avgIntensity * 1.4)
    .map((w) => ({ atMs: w.startMs, relativeIntensity: w.intensity as number }));

  const laughterMoments: ProsodyMarkers["laughterMoments"] = words
    .filter((w) => w.isLaughter)
    .map((w) => ({ atMs: w.startMs }));

  return { silences, intensityPeaks, laughterMoments };
}
