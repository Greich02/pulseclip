import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { ViralScoreBadge } from "@/components/viral-score-badge";
import { ExportPanel } from "@/components/export-panel";
import { formatTimecode } from "@/lib/utils";
import type { SequenceCandidate, ScoreSignals } from "@/lib/sequence-schema";

const SIGNAL_LABELS: Record<keyof ScoreSignals, string> = {
  voiceIntensity: "Intensité vocale",
  emotionalWordDensity: "Densité émotionnelle",
  laughterOrSilence: "Rire / silence",
  narrativeCoherence: "Cohérence narrative",
};

export default async function SequenceDetailPage({ params }: { params: { id: string; seqId: string } }) {
  const sequence = await prisma.sequence.findFirst({
    where: { id: params.seqId, videoId: params.id, video: { userId: SINGLE_USER_ID } },
    include: { video: true },
  });
  if (!sequence) notFound();

  const videoSrc = await createPresignedDownloadUrl(sequence.video.r2Key, 3600);
  const signals = sequence.scoreSignals as unknown as ScoreSignals;
  const onScreenText = sequence.onScreenText as unknown as SequenceCandidate["onScreenText"];
  const soundDesign = sequence.soundDesign as unknown as SequenceCandidate["soundDesign"];

  return (
    <>
      <div className="flex h-[52px] items-center border-b border-border px-6">
        <span className="text-sm font-medium">
          {sequence.video.title} — {formatTimecode(sequence.startMs)} à {formatTimecode(sequence.endMs)}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <video
            controls
            src={`${videoSrc}#t=${sequence.startMs / 1000},${sequence.endMs / 1000}`}
            className="mb-4 w-full rounded-lg border border-border bg-black"
          />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ViralScoreBadge score={sequence.viralScore} />
            {(Object.keys(SIGNAL_LABELS) as Array<keyof ScoreSignals>).map((key) => (
              <span key={key} className="rounded-sm bg-bg-3 px-2.5 py-1 text-[11px] text-t-2">
                {SIGNAL_LABELS[key]} <span className="font-mono-num text-t-1">{Math.round(signals[key])}</span>
              </span>
            ))}
          </div>

          <p className="mb-6 text-[13px] leading-relaxed text-t-2">{sequence.justification}</p>

          <div className="mb-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wide text-t-3">Texte à l'écran</p>
              <ul className="space-y-2">
                {onScreenText.map((item, i) => (
                  <li key={i} className="rounded-md bg-bg-2 p-3 text-[13px]">
                    <p>"{item.text}"</p>
                    <p className="mt-1 font-mono-num text-[11px] text-t-3">apparition à +{item.appearAtMs}ms</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wide text-t-3">Effets suggérés</p>
              <ul className="space-y-2">
                {soundDesign.map((item, i) => (
                  <li key={i} className="rounded-md bg-bg-2 p-3 text-[13px]">
                    <p>
                      <span className="rounded-sm bg-bg-3 px-1.5 py-0.5 font-mono-num text-[10px] uppercase text-primary-light">
                        {item.category}
                      </span>{" "}
                      {item.description}
                    </p>
                    <p className="mt-1 font-mono-num text-[11px] text-t-3">à +{item.atMs}ms</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-t-2">
                <span className="text-t-3">Musique : </span>
                {sequence.musicSuggestion}
              </p>
            </div>
          </div>

          <ExportPanel sequenceId={sequence.id} />
        </div>
      </div>
    </>
  );
}
