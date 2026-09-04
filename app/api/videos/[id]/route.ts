import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { deleteObject } from "@/lib/s3";

/**
 * Deletes a video: its R2 objects (source upload, extracted audio, every
 * export clip/srt produced from its sequences) and all associated DB rows
 * (ExportJob → Sequence → Usage → Video). There's no automatic retention
 * sweep yet (Video.purgeAfter / ExportJob.expiresAt are recorded per §7 but
 * nothing acts on them) — this manual delete is the only way to free R2
 * storage today.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = SINGLE_USER_ID;

  const video = await prisma.video.findFirst({
    where: { id: params.id, userId },
    include: { sequences: { include: { exports: true } } },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const r2Keys = [
    video.r2Key,
    video.audioR2Key,
    ...video.sequences.flatMap((seq) => seq.exports.flatMap((job) => [job.r2KeyClip, job.r2KeySrt])),
  ].filter((key): key is string => Boolean(key));

  // Best-effort: an already-missing R2 object shouldn't block deleting the
  // DB rows (e.g. the two videos uploaded before R2 was configured never
  // had a real object in the first place).
  await Promise.allSettled(r2Keys.map((key) => deleteObject(key)));

  const sequenceIds = video.sequences.map((seq) => seq.id);
  await prisma.$transaction([
    prisma.exportJob.deleteMany({ where: { sequenceId: { in: sequenceIds } } }),
    prisma.sequence.deleteMany({ where: { videoId: video.id } }),
    prisma.usage.deleteMany({ where: { videoId: video.id } }),
    prisma.video.delete({ where: { id: video.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
