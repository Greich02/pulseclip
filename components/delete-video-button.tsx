"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Deletes a video (source upload + extracted audio + every export clip/srt
 * in R2, plus the DB rows — see app/api/videos/[id]/route.ts) — the only
 * way to free R2 storage today, since nothing acts on the §7 retention
 * fields (Video.purgeAfter / ExportJob.expiresAt) yet.
 *
 * `variant="icon"` is a bare trash icon meant to sit absolutely-positioned
 * over a VideoCard (which is itself wrapped in a Link, so the click handler
 * stops propagation to avoid triggering navigation); `variant="labeled"` is
 * a full danger Button for the video detail page header.
 */
export function DeleteVideoButton({
  videoId,
  videoTitle,
  redirectTo,
  variant = "icon",
  className,
}: {
  videoId: string;
  videoTitle: string;
  redirectTo?: string;
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    const confirmed = window.confirm(
      `Supprimer "${videoTitle}" ?\n\nLa vidéo source, l'audio extrait et tous les exports associés seront définitivement supprimés de R2. Cette action est irréversible.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch {
      window.alert("La suppression a échoué.");
      setLoading(false);
    }
  }

  if (variant === "labeled") {
    return (
      <Button variant="danger" onClick={handleClick} disabled={loading} className={className}>
        <Trash2 size={14} />
        {loading ? "Suppression..." : "Supprimer"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Supprimer la vidéo"
      aria-label="Supprimer la vidéo"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm bg-bg-1/80 text-t-3 opacity-0 backdrop-blur-sm transition-opacity hover:bg-danger/20 hover:text-danger disabled:pointer-events-none disabled:opacity-100 group-hover:opacity-100",
        className
      )}
    >
      <Trash2 size={14} className={loading ? "animate-pulse" : undefined} />
    </button>
  );
}
