import type { NextRequest } from "next/server";
import { hasHqSession } from "../../../../../lib/data/requestSecurity";
import { SupabaseSnapshotStore } from "../../../../../lib/data/supabaseSnapshotStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasHqSession(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return Response.json({
      datasets: await new SupabaseSnapshotStore().listStatuses(),
    });
  } catch {
    return Response.json(
      {
        error:
          "Dataset status is unavailable. Apply the data snapshot migration, then try again.",
      },
      { status: 503 },
    );
  }
}
