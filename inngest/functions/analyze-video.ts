import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { downloadObjectToFile } from "@/lib/s3";
import { extractAudio, probeVideo, cleanupTmp } from "@/lib/ffmpeg";
import { transcribeAudio, deriveProsody } from "@/lib/deepgram";
import { detectSequences } from "@/lib/anthropic";
import { computeViralScore } from "@/lib/viral-score";
import { logDeepgramUsage, logAnthropicUsage } from "@/lib/usage";
import { sendAnalysisCompleteEmail, sendAnalysisFailedEmail } from "@/lib/resend";

/**
 * F-02 pipeline orchestration. Mirrors the 4 steps shown on the "Statut du
 * pipeline" screen in the design mockup:
 *   Extraction audio → Transcription Deepgram → Analyse prosodique →
 *   Détection des séquences (Claude)
 *
 * Each `step.run` is memoized by Inngest (idempotent replay per §8.3) and
 * we also persist `currentStep` on the Video row so the UI can poll status
 * without depending on Inngest internals.
 */
export const analyzeVideo = inngest.createFunction(
  { id: "analyze-video", retries: 2 },
  { event: "video/uploaded" },
  async ({ event, step }) => {
    const { videoId, userId } = event.data;

    const video = await step.run("load-video", async () => {
      const v = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
      await prisma.video.update({ where: { id: videoId }, data: { status: "processing" } });
      return v;
    });

    const workDir = path.join(os.tmpdir(), "pulseclip", crypto.randomUUID());

    try {
      // 1. Extraction audio
      const { audioPath, durationSeconds } = await step.run("extract-audio", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { currentStep: "extract_audio" } });
        fs.mkdirSync(workDir, { recursive: true });
        const sourcePath = path.join(workDir, "source" + path.extname(video.originalFilename));
        await downloadObjectToFile(video.r2Key, sourcePath);
        const metadata = await probeVideo(sourcePath);
        const rounded = Math.round(metadata.durationSeconds);
        await prisma.video.update({ where: { id: videoId }, data: { durationSeconds: rounded } });
        const audio = await extractAudio(sourcePath);
        return { audioPath: audio, durationSeconds: rounded };
      });

      // 2. Transcription Deepgram
      const transcript = await step.run("transcribe", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { currentStep: "transcribe" } });
        const result = await transcribeAudio(audioPath);
        const audioSeconds = result.words.length > 0 ? result.words[result.words.length - 1].endMs / 1000 : 0;
        await logDeepgramUsage(videoId, audioSeconds);
        await prisma.video.update({ where: { id: videoId }, data: { transcript: result as any } });
        return result;
      });

      // 3. Analyse prosodique
      const prosody = await step.run("prosody", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { currentStep: "prosody" } });
        const markers = deriveProsody(transcript);
        await prisma.video.update({ where: { id: videoId }, data: { prosody: markers as any } });
        return markers;
      });

      // 4. Détection des séquences (Claude)
      const settings = await step.run("load-settings", async () => {
        return prisma.userSettings.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      });

      const { sequences } = await step.run("detect-sequences", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { currentStep: "detect_sequences" } });
        const { result, inputTokens, outputTokens } = await detectSequences({
          videoTitle: video.title,
          durationSeconds,
          words: transcript.words,
          prosody,
          minSequenceScore: settings.minSequenceScore,
          durationRangeSec: {
            min: settings.sequenceDurationMinSec,
            max: settings.sequenceDurationMaxSec,
          },
        });
        await logAnthropicUsage(videoId, inputTokens, outputTokens);
        return result;
      });

      // Persist + finalize
      await step.run("persist-sequences", async () => {
        await prisma.$transaction([
          prisma.sequence.deleteMany({ where: { videoId } }), // idempotent replay guard
          prisma.sequence.createMany({
            data: sequences.map((seq) => ({
              videoId,
              startMs: seq.startMs,
              endMs: seq.endMs,
              viralScore: computeViralScore(seq.scoreSignals),
              scoreSignals: seq.scoreSignals as any,
              justification: seq.justification,
              onScreenText: seq.onScreenText as any,
              subtitleCues: seq.subtitleCues as any,
              soundDesign: seq.soundDesign as any,
              musicSuggestion: seq.musicSuggestion,
            })),
          }),
          prisma.video.update({
            where: { id: videoId },
            data: {
              status: "completed",
              currentStep: "done",
              durationSeconds,
              purgeAfter: new Date(Date.now() + 30 * 24 * 3600 * 1000),
            },
          }),
        ]);
      });

      await step.run("notify-complete", async () => {
        if (!settings.emailOnAnalysisComplete) return;
        const email = process.env.NOTIFICATION_EMAIL;
        if (!email) return; // no login/user record to pull an address from — single-user app
        await sendAnalysisCompleteEmail({
          to: email,
          videoTitle: video.title,
          sequenceCount: sequences.length,
          videoUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/videos/${videoId}`,
        });
      });

      return { videoId, sequenceCount: sequences.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "error", errorMessage: message },
      });
      try {
        const email = process.env.NOTIFICATION_EMAIL;
        if (email) {
          await sendAnalysisFailedEmail({
            to: email,
            videoTitle: video.title,
            errorMessage: message,
            videoUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/videos/${videoId}`,
          });
        }
      } catch {
        // notification failure shouldn't mask the original pipeline error
      }
      throw error;
    } finally {
      cleanupTmp(path.join(workDir, "noop"));
    }
  }
);
