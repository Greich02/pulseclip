import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Film } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/video-card";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const videos = await prisma.video.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sequences: true } } },
  });

  return (
    <>
      <div className="flex h-[52px] items-center justify-between border-b border-border px-6">
        <span className="text-sm font-medium">Mes vidéos</span>
        <Link href="/dashboard/upload">
          <Button variant="primary">+ Nouvelle vidéo</Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-2 text-t-3">
              <Film size={22} />
            </div>
            <p className="text-sm text-t-2">Aucune vidéo pour l'instant.</p>
            <Link href="/dashboard/upload">
              <Button variant="primary">Uploader ta première vidéo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={{
                  id: video.id,
                  title: video.title,
                  status: video.status,
                  durationSeconds: video.durationSeconds,
                  sequenceCount: video._count.sequences,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
