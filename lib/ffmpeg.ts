import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";

// All FFmpeg calls live here and are only ever invoked from Inngest
// functions (never a request-handling API route) — see §7/§8.3. This keeps
// the code ready to move the worker to Railway/Fly.io without touching
// call sites.

// Vercel's serverless runtime has no system ffmpeg/ffprobe on PATH — these
// packages bundle static Linux binaries (fetched for the build's platform
// at `npm install` time) and we point fluent-ffmpeg at them explicitly.
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const TMP_ROOT = path.join(os.tmpdir(), "pulseclip");

function tmpDir(): string {
  const dir = path.join(TMP_ROOT, crypto.randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Defensive sweep for orphaned temp files. Vercel can reuse a warm
 * container across invocations, and a killed/interrupted run's own
 * cleanup may never get to run — so a failed attempt's source-video
 * download (hundreds of MB) can linger and starve the next attempt of
 * the small (~512MB) /tmp quota with ENOSPC. Call this before writing any
 * sizeable file to disk.
 */
export async function cleanupStaleTmp(): Promise<void> {
  await fs.promises.rm(TMP_ROOT, { recursive: true, force: true }).catch(() => undefined);
}

export interface VideoMetadata {
  durationSeconds: number;
  keyframeTimestampsSec: number[];
}

export function probeVideo(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const durationSeconds = data.format.duration ?? 0;
      resolve({ durationSeconds, keyframeTimestampsSec: [] });
    });
  });
}

/** F-02 step 1: extract the audio track for transcription. */
export function extractAudio(sourcePath: string): Promise<string> {
  const outputPath = path.join(tmpDir(), "audio.wav");
  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .on("error", reject)
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * F-05: cut a sequence out of the source video. Tries a fast stream copy
 * first (`-c copy`, only valid when the cut lands on a keyframe); on
 * failure it falls back to re-encoding just that segment, never the whole
 * video, per §8.3.
 */
export async function cutClip(sourcePath: string, startMs: number, endMs: number): Promise<string> {
  const outputPath = path.join(tmpDir(), "clip.mp4");
  const startSec = startMs / 1000;
  const durationSec = (endMs - startMs) / 1000;

  try {
    await runCut(sourcePath, outputPath, startSec, durationSec, { copy: true });
    return outputPath;
  } catch {
    // Cut point wasn't on a keyframe (or copy isn't supported for this
    // container) — re-encode just this segment instead.
    await runCut(sourcePath, outputPath, startSec, durationSec, { copy: false });
    return outputPath;
  }
}

function runCut(
  sourcePath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
  opts: { copy: boolean }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(sourcePath).setStartTime(startSec).setDuration(durationSec);

    if (opts.copy) {
      command.outputOptions(["-c", "copy"]);
    } else {
      command.videoCodec("libx264").audioCodec("aac").outputOptions(["-preset", "veryfast"]);
    }

    command
      .on("error", reject)
      .on("end", () => resolve())
      .save(outputPath);
  });
}

export function readFileBuffer(filePath: string): Promise<Buffer> {
  return fs.promises.readFile(filePath);
}

/** Removes a temp directory this module created, awaited so it reliably
 * finishes before the serverless function returns (a fire-and-forget
 * `fs.rm` callback can be torn down mid-flight, leaving the file behind
 * to eat into the next invocation's /tmp quota). */
export async function cleanupTmp(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}
