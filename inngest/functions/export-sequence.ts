import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { downloadObjectToFile, uploadBuffer, exportObjectKey, createPresignedDownloadUrl } from "@/lib/s3";
import { cutClip, readFileBuffer, cleanupTmp, cleanupStaleTmp } from "@/lib/ffmpeg";
import { generateSrt } from "@/lib/srt";
import type { SequenceCandidate } from "@/lib/sequence-schema";

const SHARE_LINK_TTL_SECONDS = 7 * 24 * 3600; // §7 retention: export links live 7 days

/**
 * F-05: cuts the sequence out of the source video (fast stream-copy when
 * possible, targeted re-encode otherwise — see lib/ffmpeg.ts) and, for the
 * "clip + srt" format, generates the matching subtitle file. Both are
 * uploaded to R2 with a 7-day signed download URL.
 */
export const exportSequence = inngest.createFunction(
  { id: "export-sequence", retries: 2 },
  { event: "sequence/export.requested" },
  async ({ event, step }) => {
    const { exportJobId, sequenceId } = event.data;

    const { sequence, video, job } = await step.run("load", async () => {
      await prisma.exportJob.update({ where: { id: exportJobId }, data: { status: "processing" } });
      const seq = await prisma.sequence.findUniqueOrThrow({
        where: { id: sequenceId },
        include: { video: true },
      });
      const j = await prisma.exportJob.findUniqueOrThrow({ where: { id: exportJobId } });
      return { sequence: seq, video: seq.video, job: j };
    });

    const workDir = path.join(os.tmpdir(), "pulseclip", crypto.randomUUID());

    try {
      const clipPath = await step.run("cut-clip", async () => {
        // See analyze-video.ts: a killed prior attempt's source-video
        // download can otherwise linger and starve this one of Vercel's
        // small /tmp quota.
        await cleanupStaleTmp();
        fs.mkdirSync(workDir, { recursive: true });
        const sourcePath = path.join(workDir, "source" + path.extname(video.originalFilename));
        await downloadObjectToFile(video.r2Key, sourcePath);
        const clip = await cutClip(sourcePath, sequence.startMs, sequence.endMs);
        // Only the (much smaller) cut clip is needed from here on.
        await cleanupTmp(workDir);
        return clip;
      });

      const clipKey = exportObjectKey(video.userId, video.id, sequence.id, "mp4");
      await step.run("upload-clip", async () => {
        const buffer = await readFileBuffer(clipPath);
        await uploadBuffer(clipKey, buffer, "video/mp4");
      });

      let srtKey: string | null = null;
      if (job.format === "clip_and_srt") {
        srtKey = exportObjectKey(video.userId, video.id, sequence.id, "srt");
        await step.run("generate-and-upload-srt", async () => {
          const cues = sequence.subtitleCues as unknown as SequenceCandidate["subtitleCues"];
          const srtContent = generateSrt(cues);
          await uploadBuffer(srtKey as string, Buffer.from(srtContent, "utf-8"), "text/plain");
        });
      }

      const shareUrl = await step.run("create-share-link", async () => {
        return createPresignedDownloadUrl(clipKey, SHARE_LINK_TTL_SECONDS);
      });

      await step.run("finalize", async () => {
        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: "completed",
            r2KeyClip: clipKey,
            r2KeySrt: srtKey,
            shareUrl,
            expiresAt: new Date(Date.now() + SHARE_LINK_TTL_SECONDS * 1000),
          },
        });
      });

      return { exportJobId, shareUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "error", errorMessage: message },
      });
      throw error;
    } finally {
      await cleanupStaleTmp();
    }
  }
);
