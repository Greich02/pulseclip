import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ViralScoreBadge } from "@/components/viral-score-badge";
import { formatTimecode, cn } from "@/lib/utils";
import type { ScoreSignals } from "@/lib/sequence-schema";

export interface SequenceCardData {
  id: string;
  videoId: string;
  startMs: number;
  endMs: number;
  viralScore: number;
  scoreSignals: ScoreSignals;
  onScreenText: Array<{ text: string; appearAtMs: number; emphasisWord?: string }>;
  soundDesign: Array<{ atMs: number; category: string; description: string }>;
}

function signalTags(signals: ScoreSignals): string[] {
  const tags: string[] = [];
  if (signals.laughterOrSilence > 70) tags.push("rire / silence marqué");
  if (signals.voiceIntensity > 70) tags.push(`pic d'intensité ${Math.round(signals.voiceIntensity)}%`);
  if (signals.emotionalWordDensity > 70) tags.push("charge émotionnelle forte");
  if (signals.narrativeCoherence > 70) tags.push("séquence autonome");
  return tags.slice(0, 3);
}

function renderHighlighted(text: string, emphasisWord?: string) {
  if (!emphasisWord) return text;
  const parts = text.split(new RegExp(`(${emphasisWord})`, "i"));
  return parts.map((part, i) =>
    part.toLowerCase() === emphasisWord.toLowerCase() ? (
      <span key={i} className="font-medium text-danger">
        {part.toUpperCase()}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Ported from .seq-card in the design mockup (screen 04 — Résultats). */
export function SequenceCard({ sequence }: { sequence: SequenceCardData }) {
  const hook = sequence.onScreenText[0];
  const effects = sequence.soundDesign.slice(0, 2);
  const tags = signalTags(sequence.scoreSignals);

  return (
    <Link href={`/dashboard/videos/${sequence.videoId}/sequences/${sequence.id}`}>
      <Card className="mb-2.5 p-4 transition-colors hover:border-border-md">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono-num text-xs text-t-2">
            {formatTimecode(sequence.startMs)} — {formatTimecode(sequence.endMs)}
          </span>
          <ViralScoreBadge score={sequence.viralScore} />
        </div>

        {tags.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-sm bg-bg-3 px-2.5 py-1 text-[11px] text-t-2">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className={cn("grid gap-3.5 border-t border-border pt-2.5", "grid-cols-1 sm:grid-cols-2")}>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-t-3">Texte à l'écran</p>
            <p className="text-xs leading-relaxed text-t-1">
              {hook ? (
                <>
                  "{renderHighlighted(hook.text, hook.emphasisWord)}" — apparition à +{(hook.appearAtMs / 1000).toFixed(1)}s
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-t-3">Effets suggérés</p>
            <p className="text-xs leading-relaxed text-t-1">
              {effects.length > 0 ? effects.map((e) => e.description).join(" · ") : "—"}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
