import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

const bodySchema = z.object({
  format: z.enum(["clip_only", "clip_and_srt"]),
});

/** F-05: enqueues the export job; the client polls /api/exports/[id]. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const sequence = await prisma.sequence.findFirst({
    where: { id: params.id, video: { userId } },
  });
  if (!sequence) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const job = await prisma.exportJob.create({
    data: { sequenceId: sequence.id, format: parsed.data.format, status: "queued" },
  });

  await inngest.send({
    name: "sequence/export.requested",
    data: { exportJobId: job.id, sequenceId: sequence.id },
  });

  return NextResponse.json({ exportJobId: job.id });
}
