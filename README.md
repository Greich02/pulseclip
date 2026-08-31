# PulseClip — MVP

> "Ton meilleur monteur ne dort jamais : il repère l'émotion, tu valides le clip."

PulseClip transforme une vidéo longue (podcast, interview, conférence, stream) en une liste priorisée de séquences à
fort potentiel viral, chacune livrée avec un pack d'édition prêt à l'emploi : score de viralité, texte à l'écran,
sous-titres stylés exportables, et suggestions de sound design horodatées.

This repo implements the 7 MVP features from `pulseclip-cahier-des-charges.md` (F-01 → F-07). Two deliberate
deviations from the original spec, both simplifications made along the way — see the notes below: **MongoDB**
instead of Postgres, and **Deepgram** instead of ElevenLabs for speech-to-text.

> **Database note:** the cahier des charges specifies PostgreSQL. The app now runs on **MongoDB Atlas** instead
> (`prisma/schema.prisma`, `provider = "mongodb"`) — same free-tier cluster for local dev and production, so
> there's no local database to run. Application code is unaffected; Prisma's query API is identical across
> connectors.

> **STT provider note:** the cahier des charges specifies ElevenLabs for speech-to-text. Until those API keys are
> available, the pipeline uses **Deepgram** instead (`lib/deepgram.ts`) — same word-level-timestamp contract, so
> swapping back later is a two-import change (see the note at the top of that file). Everything downstream
> (prosody derivation, the Claude call, viral score, SRT export) is provider-agnostic.

## Stack

Next.js 14 (App Router) · Tailwind CSS · Clerk · MongoDB Atlas + Prisma (standing in for Postgres, see note above) ·
Cloudflare R2 · Deepgram Speech-to-Text (standing in for ElevenLabs, see note above) · Anthropic Claude (structured
tool-use) · Inngest · FFmpeg · Resend · Zod.

## Project structure

```
app/
  (marketing)/page.tsx              Landing page
  sign-in/, sign-up/                Clerk auth screens
  (dashboard)/dashboard/            Library, upload, video status, sequence detail, settings
  api/upload/presign                F-01: presigned R2 upload URL
  api/videos/[id]/notify-uploaded   Triggers the analysis pipeline
  api/inngest                       Inngest serve handler
  api/sequences/[id]/export         F-05: enqueues an export job
  api/exports/[id]                  Export job status polling
inngest/functions/
  analyze-video.ts                  F-02 pipeline: audio → transcript → prosody → Claude → persist → email
  export-sequence.ts                F-05: ffmpeg cut + srt → R2 → 7-day share link
lib/
  s3.ts, anthropic.ts, deepgram.ts, ffmpeg.ts, resend.ts, prisma.ts
  viral-score.ts, srt.ts, sequence-schema.ts    pure, unit-tested logic
components/                          UI matching pulseclip-design.html's design system
prisma/schema.prisma                 Video, Sequence, ExportJob, Usage, UserSettings
tests/                                Vitest: unit + mocked-pipeline integration tests
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database

```bash
cp .env.example .env.local
```

Fill in `.env.local` — at minimum `DATABASE_URL` with a MongoDB Atlas connection string (free M0 cluster is
plenty) to sync the schema; the other service keys (Clerk, R2, Deepgram, Anthropic, Inngest, Resend) are needed to
actually exercise F-01→F-07 end to end, but the app builds and type-checks without them.

```bash
npm run prisma:push
```

`prisma db push` syncs collections/indexes straight from `schema.prisma` — Mongo has no SQL migration engine, so
there's no `migrate` step or migrations folder to keep in sync.

### 3. Run the app

Two processes in dev, matching the Inngest local workflow:

```bash
npm run dev            # Next.js on :3000
npm run dev:inngest    # Inngest dev server, points at /api/inngest
```

FFmpeg must be installed and on `PATH` for the analysis and export pipelines to run locally (`ffmpeg -version` to
check). In production this logic is meant to run on a separate worker (Railway/Fly.io) per §3.2/§7 of the spec —
`lib/ffmpeg.ts` is only ever called from Inngest functions, never from a request-handling route, so moving it later
needs no refactor.

### 4. Tests

```bash
npm run typecheck
npm test
```

`tests/viral-score.test.ts`, `tests/srt.test.ts`, `tests/sequence-schema.test.ts` cover the §9.1 unit-test
requirements (score composite, SRT generation, Claude JSON-schema validation). `tests/pipeline.integration.test.ts`
exercises the same transcript → prosody → Claude-shape → viral-score → SRT composition the Inngest pipeline runs,
using mocked service responses (§9.2) — a true end-to-end run needs live credentials and a reachable database.

## What you need to run it live

| Service | Used for | Where to get it |
|---|---|---|
| MongoDB Atlas | Database (all models) — standing in for Postgres | cloud.mongodb.com — free M0 cluster, connection string |
| Clerk | Auth (F-07) | dashboard.clerk.com — copy publishable + secret keys |
| Cloudflare R2 | Video storage, direct browser upload (F-01, F-05) | Create a bucket + API token with R2 read/write |
| Deepgram | Speech-to-text with word timestamps (F-02) — standing in for ElevenLabs | console.deepgram.com — API key |
| Anthropic | Sequence detection + recommendations (F-02, F-03, F-04) | console.anthropic.com — API key |
| Inngest | Async pipeline orchestration | Free for local dev via `inngest-cli`; inngest.com for hosted |
| Resend | Analysis-complete email (F-02, §6) | resend.com — API key + verified sender domain |
| ffmpeg binary | Audio extraction + clip export | Install locally, or bake into the worker's Docker image |

## Design system

Tailwind theme (`tailwind.config.ts`) ports the tokens from `pulseclip-design.html` 1:1: `#111110` background,
`#7F77DD` primary/indigo, `#D85A30` coral for viral scores over 80, Inter for UI text, JetBrains Mono for every
number (scores, timecodes, durations), 8px/12px radii, 0.5px hairline borders.

## Known MVP limitations (by design, per the spec's V2 table)

No voice-over generation, no per-platform hook variants, no real sound-library matching (suggestions are text
descriptions only), no team/org spaces, no billing — the `Usage` table logs per-video Deepgram/Claude cost so a
credits or subscription model can be layered on later without a schema change.
