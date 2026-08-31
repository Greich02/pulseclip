import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible: same SDK, different endpoint.
// Client is built lazily (not at module load) so `next build` never throws
// on missing secrets — it only matters once a route actually uses it.
let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  }
  return value;
}

function bucket(): string {
  return requireEnv("R2_BUCKET_NAME");
}

/**
 * F-01: presigned PUT URL so the browser uploads the source video directly
 * to R2 — no video bytes ever pass through the Next.js server.
 */
export async function createPresignedUploadUrl(key: string, contentType: string, expiresInSeconds = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds });
}

/**
 * Used by the export flow (F-05) to hand back a temporary download link,
 * valid 7 days per §7 retention policy.
 */
export async function createPresignedDownloadUrl(key: string, expiresInSeconds = 7 * 24 * 3600) {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds });
}

export async function uploadBuffer(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Streams an R2 object to a local file — used by Inngest steps that need
 * the source video/audio on disk for FFmpeg/Deepgram. */
export async function downloadObjectToFile(key: string, destPath: string): Promise<void> {
  const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = response.Body;
  if (!body) throw new Error(`R2 object ${key} has no body`);

  const fs = await import("node:fs");
  const { pipeline } = await import("node:stream/promises");

  await pipeline(body as unknown as NodeJS.ReadableStream, fs.createWriteStream(destPath));
}

export function publicUrlForKey(key: string): string {
  const host = process.env.R2_PUBLIC_HOSTNAME;
  return host ? `https://${host}/${key}` : `/r2/${key}`;
}

export function videoObjectKey(userId: string, videoId: string, filename: string): string {
  return `videos/${userId}/${videoId}/source-${filename}`;
}

export function audioObjectKey(userId: string, videoId: string): string {
  return `videos/${userId}/${videoId}/audio.wav`;
}

export function exportObjectKey(userId: string, videoId: string, sequenceId: string, extension: string): string {
  return `exports/${userId}/${videoId}/${sequenceId}.${extension}`;
}
