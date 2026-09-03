import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { inngest } from "@/inngest/client";

/**
 * Client calls this once the direct-to-R2 upload finishes. Flips the video
 * to `processing` and emits `video/uploaded` to kick off the F-02 pipeline
 * (§8.2 step 3).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = SINGLE_USER_ID;

  const video = await prisma.video.findFirst({ where: { id: params.id, userId } });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (video.status !== "uploaded") {
    return NextResponse.json({ error: "invalid_status", status: video.status }, { status: 409 });
  }

  await inngest.send({ name: "video/uploaded", data: { videoId: video.id, userId } });

  return NextResponse.json({ ok: true });
}
