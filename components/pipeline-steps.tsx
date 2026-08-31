import { cn } from "@/lib/utils";

const STEPS = [
  { key: "extract_audio", title: "Extraction audio" },
  { key: "transcribe", title: "Transcription Deepgram" },
  { key: "prosody", title: "Analyse prosodique" },
  { key: "detect_sequences", title: "Détection des séquences (Claude)" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
type PipelineStep = StepKey | "pending" | "done";

function statusFor(stepKey: StepKey, currentStep: PipelineStep): "done" | "active" | "pending" {
  const order: PipelineStep[] = ["pending", "extract_audio", "transcribe", "prosody", "detect_sequences", "done"];
  const currentIndex = order.indexOf(currentStep);
  const stepIndex = order.indexOf(stepKey);
  if (currentIndex > stepIndex) return "done";
  if (currentIndex === stepIndex) return "active";
  return "pending";
}

/** Ported from .pipeline-steps / .p-step in the design mockup (screen 03). */
export function PipelineSteps({ currentStep, errorMessage }: { currentStep: PipelineStep; errorMessage?: string | null }) {
  return (
    <div className="flex flex-col">
      {STEPS.map((step) => {
        const status = errorMessage ? "pending" : statusFor(step.key, currentStep);
        return (
          <div
            key={step.key}
            className={cn(
              "relative ml-[11px] flex items-center gap-3 border-l-[1.5px] py-3 pl-5",
              status === "done" || status === "active" ? "border-border-md" : "border-border-md"
            )}
          >
            <span
              className={cn(
                "absolute -left-[6.5px] top-4 h-[11px] w-[11px] rounded-full border-[1.5px]",
                status === "done" && "border-success bg-success",
                status === "active" && "border-primary bg-primary",
                status === "pending" && "border-border-md bg-bg-3"
              )}
            />
            <div>
              <p className="text-[13px] font-medium">{step.title}</p>
              <p className="font-mono-num text-[11px] text-t-3">
                {status === "done" && "terminé"}
                {status === "active" && "en cours..."}
                {status === "pending" && "en attente"}
              </p>
            </div>
          </div>
        );
      })}
      {errorMessage && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">Erreur pendant l'analyse : {errorMessage}</p>
      )}
    </div>
  );
}
