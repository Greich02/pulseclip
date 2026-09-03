import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.exportJob.findFirst({
    where: { id: params.id, sequence: { video: { userId: SINGLE_USER_ID } } },
  });
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    shareUrl: job.shareUrl,
    errorMessage: job.errorMessage,
    expiresAt: job.expiresAt,
  });
}
