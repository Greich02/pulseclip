import { cn } from "@/lib/utils";
import { scoreTier } from "@/lib/viral-score";

/** Ported from .score-badge.high / .score-badge.mid in the design mockup. */
export function ViralScoreBadge({ score, className }: { score: number; className?: string }) {
  const tier = scoreTier(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 font-mono-num text-[11px] font-medium",
        tier === "high" ? "bg-danger/[0.18] text-[#F0997B]" : "bg-primary/[0.18] text-primary-light",
        className
      )}
      title={tier === "high" ? "Score de viralité élevé" : "Score de viralité"}
    >
      score {score}
    </span>
  );
}
