import { Inngest, EventSchemas } from "inngest";

type Events = {
  "video/uploaded": {
    data: { videoId: string; userId: string };
  };
  "sequence/export.requested": {
    data: { exportJobId: string; sequenceId: string };
  };
};

export const inngest = new Inngest({
  id: "pulseclip",
  schemas: new EventSchemas().fromRecord<Events>(),
});
