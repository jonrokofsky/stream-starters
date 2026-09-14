import type { NextRequest } from "next/server";
import { DATASET_CATALOG, isDatasetKey } from "../../../../lib/data/catalog";
import { SupabaseSnapshotStore } from "../../../../lib/data/supabaseSnapshotStore";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await context.params;
  if (!isDatasetKey(dataset)) {
    return Response.json({ error: "Unknown dataset." }, { status: 404 });
  }
  try {
    const snapshot = await new SupabaseSnapshotStore().getActive(dataset);
    if (!snapshot) {
      return Response.json(
        { error: `${DATASET_CATALOG[dataset].label} data is not available yet.` },
        { status: 404 },
      );
    }
    return Response.json({
      data: snapshot.rows,
      metadata: {
        schemaVersion: snapshot.schemaVersion,
        updatedAt: snapshot.ingestedAt,
        sourceTimestamp: snapshot.sourceTimestamp,
        rowCount: snapshot.rowCount,
        sourceLabel: snapshot.sourceLabel,
        checksum: snapshot.checksum,
        sourceDetails: snapshot.sourceDetails,
      },
    });
  } catch {
    return Response.json(
      { error: `${DATASET_CATALOG[dataset].label} data is temporarily unavailable.` },
      { status: 503 },
    );
  }
}
