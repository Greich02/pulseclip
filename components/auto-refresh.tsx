"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls the server component route while a pipeline/export job is still
 * running, so the status screen updates without a manual reload. */
export function AutoRefresh({ active, intervalMs = 3000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
