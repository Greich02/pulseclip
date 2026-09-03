"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Manual fallback for F-02's automatic trigger (upload-dropzone.tsx calling
 * notify-uploaded right after the R2 upload finishes). Shown on the video
 * status page whenever a video is stuck `uploaded` (auto-trigger failed —
 * e.g. Inngest wasn't configured yet) or `error` (a previous run failed and
 * needs a clean retry).
 */
export function AnalysisTrigger({ videoId, variant }: { videoId: string; variant: "start" | "retry" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/notify-uploaded`, { method: "POST" });
      if (!res.ok) throw new Error("Le déclenchement de l'analyse a échoué.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le déclenchement de l'analyse a échoué.");
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col items-start gap-2">
      <Button variant="primary" onClick={trigger} disabled={loading}>
        <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
        {loading
          ? "Déclenchement..."
          : variant === "retry"
            ? "Relancer l'analyse"
            : "Lancer l'analyse manuellement"}
      </Button>
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
