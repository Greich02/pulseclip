import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SINGLE_USER_ID } from "@/lib/constants";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Reads live settings from the database on every request — without this,
// Next.js has no signal that the page depends on dynamic data (no auth(),
// cookies(), or searchParams left to imply it) and will statically
// prerender it once at build time, serving a stale snapshot to everyone.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // upsert instead of findUnique-then-create: the latter isn't atomic, and
  // running this page twice concurrently (e.g. Next prerendering it during
  // build) raced on the unique _id and crashed the build.
  const settings = await prisma.userSettings.upsert({
    where: { userId: SINGLE_USER_ID },
    update: {},
    create: { userId: SINGLE_USER_ID },
  });

  async function updateSettings(formData: FormData) {
    "use server";

    await prisma.userSettings.update({
      where: { userId: SINGLE_USER_ID },
      data: {
        defaultPlatformTarget: String(formData.get("defaultPlatformTarget") ?? "tiktok"),
        minSequenceScore: Number(formData.get("minSequenceScore") ?? 60),
        sequenceDurationMinSec: Number(formData.get("sequenceDurationMinSec") ?? 20),
        sequenceDurationMaxSec: Number(formData.get("sequenceDurationMaxSec") ?? 90),
        highlightColor: String(formData.get("highlightColor") ?? "#D85A30"),
        keywordCase: String(formData.get("keywordCase") ?? "uppercase"),
        emailOnAnalysisComplete: formData.get("emailOnAnalysisComplete") === "on",
      },
    });
    revalidatePath("/dashboard/settings");
  }

  return (
    <>
      <div className="flex h-[52px] items-center border-b border-border px-6">
        <span className="text-sm font-medium">Paramètres</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <form action={updateSettings} className="mx-auto max-w-md space-y-5">
          <div>
            <Label htmlFor="defaultPlatformTarget">Plateforme cible par défaut</Label>
            <select
              id="defaultPlatformTarget"
              name="defaultPlatformTarget"
              defaultValue={settings.defaultPlatformTarget}
              className="h-9 w-full rounded-sm border border-border-md bg-bg-2 px-3 text-[13px] text-t-1 outline-none"
            >
              <option value="tiktok">TikTok</option>
              <option value="reels">Instagram Reels</option>
              <option value="shorts">YouTube Shorts</option>
            </select>
          </div>

          <div>
            <Label htmlFor="minSequenceScore">Score minimum des séquences</Label>
            <Input id="minSequenceScore" name="minSequenceScore" type="number" min={0} max={100} defaultValue={settings.minSequenceScore} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="sequenceDurationMinSec">Durée min. (s)</Label>
              <Input id="sequenceDurationMinSec" name="sequenceDurationMinSec" type="number" min={5} defaultValue={settings.sequenceDurationMinSec} />
            </div>
            <div className="flex-1">
              <Label htmlFor="sequenceDurationMaxSec">Durée max. (s)</Label>
              <Input id="sequenceDurationMaxSec" name="sequenceDurationMaxSec" type="number" min={5} defaultValue={settings.sequenceDurationMaxSec} />
            </div>
          </div>

          <div>
            <Label htmlFor="highlightColor">Couleur de surbrillance des sous-titres</Label>
            <Input id="highlightColor" name="highlightColor" type="text" defaultValue={settings.highlightColor} />
          </div>

          <div>
            <Label htmlFor="keywordCase">Casse des mots-clés</Label>
            <select
              id="keywordCase"
              name="keywordCase"
              defaultValue={settings.keywordCase}
              className="h-9 w-full rounded-sm border border-border-md bg-bg-2 px-3 text-[13px] text-t-1 outline-none"
            >
              <option value="uppercase">MAJUSCULES</option>
              <option value="none">Normal</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-t-2">
            <input type="checkbox" name="emailOnAnalysisComplete" defaultChecked={settings.emailOnAnalysisComplete} />
            M'envoyer un email quand une analyse est terminée
          </label>

          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </form>
      </div>
    </>
  );
}
