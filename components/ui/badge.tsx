import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Ported from .status-pill and .score-badge in pulseclip-design.html.
const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 font-mono-num text-[10px]", {
  variants: {
    variant: {
      done: "bg-success/15 text-success",
      processing: "bg-warning/15 text-warning",
      error: "bg-danger/15 text-danger",
      neutral: "bg-bg-3 text-t-2",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export const STATUS_LABELS: Record<string, string> = {
  uploaded: "en attente",
  processing: "en cours",
  completed: "terminé",
  error: "erreur",
};

export const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  uploaded: "neutral",
  processing: "processing",
  completed: "done",
  error: "error",
};
