"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Format = "clip_only" | "clip_and_srt";
type JobStatus = "queued" | "processing" | "completed" | "error";

/** F-05: lets the user pick an export format, enqueues the Inngest export
 * job, and polls until a share link is ready. */
export function ExportPanel({ sequenceId }: { sequenceId: string }) {
  const [format, setFormat] = useState<Format>("clip_and_srt");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function startExport() {
    setError(null);
    setShareUrl(null);
    setStatus("queued");
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error("Échec du lancement de l'export.");
      const { exportJobId } = await res.json();
      setJobId(exportJobId);

      pollRef.current = setInterval(async () => {
        const pollRes = await fetch(`/api/exports/${exportJobId}`);
        if (!pollRes.ok) return;
        const job = await pollRes.json();
        setStatus(job.status);
        if (job.status === "completed") {
          setShareUrl(job.shareUrl);
          if (pollRef.current) clearInterval(pollRef.current);
        }
        if (job.status === "error") {
          setError(job.errorMessage ?? "L'export a échoué.");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as Format)}
        disabled={status === "queued" || status === "processing"}
        className="h-9 rounded-sm border border-border-md bg-bg-2 px-3 text-[13px] text-t-1 outline-none"
      >
        <option value="clip_and_srt">Clip + sous-titres (.mp4 + .srt)</option>
        <option value="clip_only">Clip seul (.mp4)</option>
      </select>

      <Button variant="primary" onClick={startExport} disabled={status === "queued" || status === "processing"}>
        <Download size={14} />
        {status === "queued" || status === "processing" ? "Export en cours..." : "Exporter le clip"}
      </Button>

      {shareUrl && (
        <a href={shareUrl} target="_blank" rel="noreferrer" className="text-[13px] text-primary-light underline">
          Télécharger l'export (lien valable 7 jours)
        </a>
      )}
      {error && <span className="text-[13px] text-danger">{error}</span>}
      {jobId && !shareUrl && !error && (
        <span className="font-mono-num text-[11px] text-t-3">statut : {status}</span>
      )}
    </div>
  );
}
