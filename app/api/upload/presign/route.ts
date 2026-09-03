import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { createPresignedUploadUrl, videoObjectKey } from "@/lib/s3";

// F-01: mirrors client-side validation server-side — never trust the browser.
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 Go, §7

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
  title: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const userId = SINGLE_USER_ID;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { filename, contentType, sizeBytes, title } = parsed.data;

  if (!ACCEPTED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "unsupported_format" }, { status: 400 });
  }

  const video = await prisma.video.create({
    data: {
      userId,
      title,
      originalFilename: filename,
      mimeType: contentType,
      sizeBytes,
      status: "uploaded",
      r2Key: "", // filled in right after, once we know the video id
    },
  });

  const r2Key = videoObjectKey(userId, video.id, filename);
  await prisma.video.update({ where: { id: video.id }, data: { r2Key } });

  const uploadUrl = await createPresignedUploadUrl(r2Key, contentType);

  return NextResponse.json({ uploadUrl, videoId: video.id });
}
