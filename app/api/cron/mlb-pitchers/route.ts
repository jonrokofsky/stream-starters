import type { NextRequest } from "next/server";
import { refreshDataset } from "../../../../lib/data/refresh";
import { handleScheduledMlbRequest } from "../../../../lib/data/scheduledPitchers";
import { SupabaseSnapshotStore } from "../../../../lib/data/supabaseSnapshotStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = await handleScheduledMlbRequest(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
    {
      now: () => new Date(),
      createStore: () => new SupabaseSnapshotStore(),
      refresh: refreshDataset,
      recordEvidence: (evidence) =>
        console.info("scheduled_dataset_refresh", evidence),
    },
  );
  return Response.json(response.body, { status: response.httpStatus });
}
