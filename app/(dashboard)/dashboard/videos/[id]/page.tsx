import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { PipelineSteps } from "@/components/pipeline-steps";
import { SequenceCard } from "@/components/sequence-card";
import { AutoRefresh } from "@/components/auto-refresh";
import { AnalysisTrigger } from "@/components/analysis-trigger";
import type { ScoreSignals } from "@/lib/sequence-schema";

export default async function VideoStatusPage({ params }: { params: { id: string } }) {
  const video = await prisma.video.findFirst({
    where: { id: params.id, userId: SINGLE_USER_ID },
    include: { sequences: { orderBy: { viralScore: "desc" } } },
  });
  if (!video) notFound();

  const isActive = video.status === "uploaded" || video.status === "processing";

  return (
    <>
      <AutoRefresh active={isActive} />
      <div className="flex h-[52px] items-center border-b border-border px-6">
        <span className="text-sm font-medium">{video.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {video.status === "completed" ? (
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-xs text-t-2">
              {video.sequences.length} séquence{video.sequences.length > 1 ? "s" : ""} détectée
              {video.sequences.length > 1 ? "s" : ""}, triées par score de viralité.
            </p>
            {video.sequences.map((seq) => (
              <SequenceCard
                key={seq.id}
                sequence={{
                  id: seq.id,
                  videoId: video.id,
                  startMs: seq.startMs,
                  endMs: seq.endMs,
                  viralScore: seq.viralScore,
                  scoreSignals: seq.scoreSignals as unknown as ScoreSignals,
                  onScreenText: seq.onScreenText as any,
                  soundDesign: seq.soundDesign as any,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            {video.status === "uploaded" && <AnalysisTrigger videoId={video.id} variant="start" />}
            {video.status === "error" && <AnalysisTrigger videoId={video.id} variant="retry" />}
            <PipelineSteps currentStep={video.currentStep} errorMessage={video.errorMessage} />
          </div>
        )}
      </div>
    </>
  );
}
