import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const job = await prisma.exportJob.findFirst({
    where: { id: params.id, sequence: { video: { userId } } },
  });
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    shareUrl: job.shareUrl,
    errorMessage: job.errorMessage,
    expiresAt: job.expiresAt,
  });
}
