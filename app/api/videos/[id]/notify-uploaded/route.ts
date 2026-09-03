import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { inngest } from "@/inngest/client";

/**
 * Triggers the F-02 analysis pipeline for a video by emitting
 * `video/uploaded` (§8.2 step 3). Two callers:
 *  - the upload flow, right after the direct-to-R2 upload finishes
 *  - the manual "Lancer l'analyse" / "Relancer l'analyse" button on the
 *    video status page, for when the automatic trigger above failed (e.g.
 *    a dependency wasn't configured yet) or a previous run errored out.
 *
 * Allowed from `uploaded` (never started) or `error` (previous run failed)
 * — not from `processing`/`completed`, so this can't double-trigger a run
 * that's already in flight or clobber a finished analysis.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = SINGLE_USER_ID;

  const video = await prisma.video.findFirst({ where: { id: params.id, userId } });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (video.status !== "uploaded" && video.status !== "error") {
    return NextResponse.json({ error: "invalid_status", status: video.status }, { status: 409 });
  }

  if (video.status === "error") {
    // Reset so the pipeline status screen starts a clean run from step 1.
    await prisma.video.update({
      where: { id: video.id },
      data: { status: "uploaded", currentStep: "pending", errorMessage: null },
    });
  }

  await inngest.send({ name: "video/uploaded", data: { videoId: video.id, userId } });

  return NextResponse.json({ ok: true });
}
