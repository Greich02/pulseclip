"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 Go, §7

type UploadState = "idle" | "uploading" | "error";

/** F-01: drag-and-drop upload with client-side validation, presigned-URL
 * direct-to-R2 upload, live progress + throughput, then redirect to the
 * pipeline status screen. */
export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validate = (file: File): string | null => {
    const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ACCEPTED_TYPES.includes(file.type) && !hasValidExt) {
      return "Format non supporté. Utilise un fichier .mp4 ou .mov.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "Fichier trop volumineux (5 Go maximum).";
    }
    return null;
  };

  const startUpload = useCallback(
    async (file: File) => {
      const validationError = validate(file);
      if (validationError) {
        setError(validationError);
        setState("error");
        return;
      }

      setError(null);
      setFileName(file.name);
      setState("uploading");
      setProgress(0);

      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "video/mp4",
            sizeBytes: file.size,
            title: file.name.replace(/\.[^.]+$/, ""),
          }),
        });

        if (!presignRes.ok) {
          throw new Error("Impossible de préparer l'upload.");
        }
        const { uploadUrl, videoId } = await presignRes.json();

        await uploadWithProgress(uploadUrl, file, (loaded, total, mbPerSec) => {
          setProgress(Math.round((loaded / total) * 100));
          setSpeed(`${mbPerSec.toFixed(1)} Mo/s`);
        });

        const notifyRes = await fetch(`/api/videos/${videoId}/notify-uploaded`, { method: "POST" });
        if (!notifyRes.ok) throw new Error("Upload terminé mais le déclenchement de l'analyse a échoué.");

        router.push(`/dashboard/videos/${videoId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec de l'upload.");
        setState("error");
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void startUpload(file);
    },
    [startUpload]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border-md",
          "text-t-2"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-3">
          <UploadCloud size={18} />
        </div>
        <p className="text-[13px]">Glisse ta vidéo ici, ou clique pour parcourir</p>
        <p className="text-[11px] text-t-3">mp4, mov — jusqu'à 5 Go</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void startUpload(file);
          }}
        />
      </div>

      {fileName && (
        <div className="mt-3.5">
          <p className="mb-1 text-xs text-t-2">{fileName}</p>
          <Progress value={progress} />
          <p className="mt-1.5 font-mono-num text-[11px] text-t-3">
            {state === "uploading" && `${progress}%${speed ? ` · ${speed}` : ""}`}
            {state === "error" && <span className="text-danger">{error}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (loaded: number, total: number, mbPerSec: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const elapsedSec = Math.max(0.001, (Date.now() - startTime) / 1000);
      const mbPerSec = e.loaded / 1024 / 1024 / elapsedSec;
      onProgress(e.loaded, e.total, mbPerSec);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload échoué (${xhr.status}).`));
    });
    xhr.addEventListener("error", () => reject(new Error("Coupure réseau pendant l'upload.")));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.send(file);
  });
}
