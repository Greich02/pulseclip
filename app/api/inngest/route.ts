import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { analyzeVideo } from "@/inngest/functions/analyze-video";
import { exportSequence } from "@/inngest/functions/export-sequence";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeVideo, exportSequence],
});
