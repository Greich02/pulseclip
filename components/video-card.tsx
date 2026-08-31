import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, STATUS_LABELS, STATUS_VARIANTS } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

export interface VideoCardData {
  id: string;
  title: string;
  status: "uploaded" | "processing" | "completed" | "error";
  durationSeconds: number | null;
  sequenceCount: number;
}

/** Ported from .video-card in the design mockup (screen 01 — Bibliothèque). */
export function VideoCard({ video }: { video: VideoCardData }) {
  const sub =
    video.status === "processing"
      ? `${video.durationSeconds ? formatDuration(video.durationSeconds) + " · " : ""}analyse...`
      : video.status === "error"
        ? "erreur pendant l'analyse"
        : `${video.durationSeconds ? formatDuration(video.durationSeconds) : "—"} · ${video.sequenceCount} séquence${video.sequenceCount > 1 ? "s" : ""}`;

  return (
    <Link href={`/dashboard/videos/${video.id}`}>
      <Card className="overflow-hidden transition-colors hover:border-border-md">
        <div className="flex h-[70px] items-center justify-center bg-gradient-to-br from-bg-3 to-bg-2 text-t-3">
          <PlayCircle size={22} />
        </div>
        <div className="p-3">
          <p className="mb-1.5 truncate text-[13px] font-medium">{video.title}</p>
          <Badge variant={STATUS_VARIANTS[video.status]}>{STATUS_LABELS[video.status]}</Badge>
          <p className="mt-1.5 font-mono-num text-[11px] text-t-3">{sub}</p>
        </div>
      </Card>
    </Link>
  );
}
