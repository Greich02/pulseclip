import { Resend } from "resend";

let _client: Resend | null = null;

function client(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing required env var RESEND_API_KEY. See .env.example.");
  _client = new Resend(apiKey);
  return _client;
}

/** §6 user_preferences.notifications.email_on_analysis_complete */
export async function sendAnalysisCompleteEmail(params: {
  to: string;
  videoTitle: string;
  sequenceCount: number;
  videoUrl: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL || "PulseClip <notifications@pulseclip.io>";
  await client().emails.send({
    from,
    to: params.to,
    subject: `${params.sequenceCount} séquences détectées dans "${params.videoTitle}"`,
    html: `
      <p>Ton analyse est terminée.</p>
      <p><strong>${params.videoTitle}</strong> — ${params.sequenceCount} séquences à fort potentiel viral ont été détectées.</p>
      <p><a href="${params.videoUrl}">Voir les résultats</a></p>
    `,
  });
}

export async function sendAnalysisFailedEmail(params: { to: string; videoTitle: string; errorMessage: string; videoUrl: string }) {
  const from = process.env.RESEND_FROM_EMAIL || "PulseClip <notifications@pulseclip.io>";
  await client().emails.send({
    from,
    to: params.to,
    subject: `Échec de l'analyse de "${params.videoTitle}"`,
    html: `
      <p>L'analyse de <strong>${params.videoTitle}</strong> a échoué.</p>
      <p>Détail : ${params.errorMessage}</p>
      <p><a href="${params.videoUrl}">Réessayer</a></p>
    `,
  });
}
