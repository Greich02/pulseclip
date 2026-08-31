import Link from "next/link";
import { Zap, Scissors, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-bg-0">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-semibold text-white">P</div>
          <span className="text-[15px] font-semibold">PulseClip</span>
        </div>
        <div className="flex gap-2">
          <Link href="/sign-in">
            <Button variant="ghost">Connexion</Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="primary">Essayer gratuitement</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-4xl font-semibold leading-tight text-t-1 sm:text-5xl">
          Ton meilleur monteur <span className="text-primary-light">ne dort jamais</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-t-2">
          PulseClip transforme n'importe quelle vidéo longue — podcast, interview, conférence, stream — en une liste
          priorisée de séquences à fort potentiel viral, avec pour chacune un pack d'édition prêt à l'emploi.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/sign-up">
            <Button variant="primary" size="lg">
              Uploader ma première vidéo
            </Button>
          </Link>
        </div>
        <p className="mt-4 font-mono-num text-xs text-t-3">2h de rush → tes 5 meilleurs clips, en quelques minutes.</p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        <Card className="p-5">
          <Zap className="mb-3 text-primary-light" size={20} />
          <h3 className="mb-1.5 text-sm font-medium">Score de viralité multi-signal</h3>
          <p className="text-[13px] leading-relaxed text-t-2">
            Intensité vocale, densité émotionnelle, rires, cohérence narrative — chaque séquence est notée et
            justifiée.
          </p>
        </Card>
        <Card className="p-5">
          <Wand2 className="mb-3 text-primary-light" size={20} />
          <h3 className="mb-1.5 text-sm font-medium">Pack d'édition généré</h3>
          <p className="text-[13px] leading-relaxed text-t-2">
            Texte à l'écran, sous-titres stylés avec mots-clés, sound design horodaté et suggestion musicale.
          </p>
        </Card>
        <Card className="p-5">
          <Scissors className="mb-3 text-primary-light" size={20} />
          <h3 className="mb-1.5 text-sm font-medium">Export en un clic</h3>
          <p className="text-[13px] leading-relaxed text-t-2">
            Clip .mp4 + .srt synchronisé, prêts pour ton logiciel de montage ou un partage direct.
          </p>
        </Card>
      </section>
    </main>
  );
}
