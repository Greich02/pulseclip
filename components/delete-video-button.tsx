"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Deletes a video (source upload + extracted audio + every export clip/srt
 * in R2, plus the DB rows — see app/api/videos/[id]/route.ts) — the only
 * way to free R2 storage today, since nothing acts on the §7 retention
 * fields (Video.purgeAfter / ExportJob.expiresAt) yet.
 *
 * Confirmation is an inline two-step (click → confirm/cancel) rather than
 * `window.confirm`, both to match the app's own dark theme instead of a
 * native browser dialog, and because a native dialog blocks in place in a
 * way plain click automation can't drive.
 *
 * `variant="icon"` is a bare trash icon meant to sit absolutely-positioned
 * over a VideoCard (which is itself wrapped in a Link, so every click
 * handler here stops propagation to avoid triggering navigation);
 * `variant="labeled"` is a full danger Button for the video detail page
 * header.
 */
export function DeleteVideoButton({
  videoId,
  redirectTo,
  variant = "icon",
  className,
}: {
  videoId: string;
  redirectTo?: string;
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleConfirm(e: React.MouseEvent) {
    stop(e);
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch {
      setLoading(false);
      setConfirming(false);
    }
  }

  function handleCancel(e: React.MouseEvent) {
    stop(e);
    setConfirming(false);
  }

  function handleStart(e: React.MouseEvent) {
    stop(e);
    setConfirming(true);
  }

  if (variant === "labeled") {
    if (confirming) {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <span className="text-xs text-t-2">Supprimer définitivement ?</span>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
            Annuler
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "Suppression..." : "Confirmer"}
          </Button>
        </div>
      );
    }
    return (
      <Button variant="danger" onClick={handleStart} className={className}>
        <Trash2 size={14} />
        Supprimer
      </Button>
    );
  }

  if (confirming) {
    return (
      <div className={cn("flex items-center gap-1 rounded-sm bg-bg-1/90 p-0.5 backdrop-blur-sm", className)}>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          title="Annuler"
          aria-label="Annuler"
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-t-3 hover:bg-bg-3 hover:text-t-1"
        >
          <X size={13} />
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          title="Confirmer la suppression"
          aria-label="Confirmer la suppression"
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-danger hover:bg-danger/20 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check size={13} className={loading ? "animate-pulse" : undefined} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      title="Supprimer la vidéo"
      aria-label="Supprimer la vidéo"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm bg-bg-1/80 text-t-3 opacity-0 backdrop-blur-sm transition-opacity hover:bg-danger/20 hover:text-danger group-hover:opacity-100",
        className
      )}
    >
      <Trash2 size={14} />
    </button>
  );
}
